// External
import colors from 'colors/safe.js';
import fs from 'node:fs';
import glob from 'glob';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import LocationConflation from '@ideditor/location-conflation';
import shell from 'shelljs';
import stringify from '@aitodotai/json-stringify-pretty-compact';
import xmlbuilder2 from 'xmlbuilder2';

const withLocale = localeCompare('en-US');

// Internal
import { fileTree } from '../lib/file_tree.js';
import { sortObject } from '../lib/sort_object.js';
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';

// JSON
import dissolvedJSON from '../dist/dissolved.json';
import packageJSON from '../package.json';
import treesJSON from '../config/trees.json';
import wikidataJSON from '../dist/wikidata.json';

const dissolved = dissolvedJSON.dissolved;
const trees = treesJSON.trees;
const wikidata = wikidataJSON.wikidata;

// iD's presets which we will build on
import presetsJSON from '@openstreetmap/id-tagging-schema/dist/presets.json';

// We use LocationConflation for validating and processing the locationSets
import featureCollectionJSON from '../dist/featureCollection.json';
const loco = new LocationConflation(featureCollectionJSON);

let _cache = {};
fileTree.read(_cache, loco);
fileTree.expandTemplates(_cache, loco);
_cache.path = sortObject(_cache.path);

buildAll();


function buildAll() {
  const START = '🏗   ' + colors.yellow('Building data...');
  const END = '👍  ' + colors.green('data built');

  console.log('');
  console.log(START);
  console.time(END);

  // Start clean
  shell.rm('-f', [
    'dist/nsi.json',
    'docs/sitemap.xml',
    'dist/taginfo.json',
    'dist/presets/*',
    'dist/*.min.json',
    'dist/collected/*.min.json',
    'dist/filtered/*.min.json'
  ]);

  // Copy some files from `/config` to `/dist`, adding metadata
  copyWithMeta('genericWords.json');
  copyWithMeta('matchGroups.json');
  copyWithMeta('replacements.json');
  copyWithMeta('trees.json');

  // Refresh some files already in `/dist`, update metadata to match version
  refreshMeta('wikidata.json');
  refreshMeta('dissolved.json');
  refreshMeta('featureCollection.json');

  // Write `nsi.json` as a single file containing everything by path
  const output = { nsi: _cache.path };
  writeFileWithMeta('dist/nsi.json', stringify(output, { maxLength: 800 }) + '\n');

  buildIDPresets();     // nsi-id-presets.json
  buildJOSMPresets();   // nsi-josm-presets.json
  buildTaginfo();
  buildSitemap();

  // minify all .json files under dist/
  glob.sync(`dist/**/*.json`).forEach(file => {
    const minFile = file.replace('.json', '.min.json');
    minifySync(file, minFile);
  });
}


function copyWithMeta(filename) {
  const contents = fs.readFileSync(`config/${filename}`, 'utf8');
  writeFileWithMeta(`dist/${filename}`, contents);
}


function refreshMeta(filename) {
  const contents = fs.readFileSync(`dist/${filename}`, 'utf8');
  let json = JSON5.parse(contents);
  delete json._meta;

  let options = {};
  if (filename === 'dissolved.json') {
    options = { maxLength: 100 };
  } else if (filename === 'featureCollection.json') {
    options = { maxLength: 9999 };
  }
  writeFileWithMeta(`dist/${filename}`, stringify(json, options) + '\n');
}


// build iD presets
// https://github.com/openstreetmap/id-tagging-schema
function buildIDPresets() {
  //
  // First we'll match every NSI item to a source iD preset.
  // The source iD presets look like this:
  //
  // "amenity": {
  //   "name": "Amenity"
  //   "fields": […],
  //   "geometry": […],
  //   "tags": {
  //     "amenity": "*"
  //   },
  //   "searchable": false
  // },
  // "amenity/fast_food": {
  //   "name": "Fast Food",
  //   "icon": "maki-fast-food",
  //   "fields": […],
  //   "geometry": […],
  //   "terms": […],
  //   "tags": {
  //     "amenity": "fast_food"
  //   }
  // },
  // "amenity/fast_food/sandwich": {
  //   "name": "Sandwich Fast Food",
  //   "icon": "temaki-sandwich",
  //   "fields": […],
  //   "geometry": […],
  //   "terms": […],
  //   "tags": {
  //     "amenity": "fast_food",
  //     "cuisine": "sandwich"
  //   }
  // },
  //
  // There are a few special behaviors in the iD presets are important to us:
  // - They each have stable identifiers like `key`, `key/value`, `key/value/anothervalue`
  // - Presets with increasing specificity "inherit" fields from presets of less specificity
  //    (e.g. the sandwich fast food preset inherits all the fields of the regular fast food preset)
  // - We can generate presets with NSI identifiers that hang off the end of this specificity chain
  //    (e.g. "amenity/fast_food/sandwich/arbys-3c08fb")
  // - NSI identifiers will not collide with the iD identifiers (NSI ids don't look like tag values)
  //

  let targetPresets = {};
  let missing = new Set();

  const paths = Object.keys(_cache.path).sort(withLocale);
  paths.forEach(tkv => {
    const properties = _cache.path[tkv].properties || {};
    const items = _cache.path[tkv].items;
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const t = parts[0];
    let k = parts[1];
    let v = parts[2];
    const tree = trees[t];

    let presetPath = `${k}/${v}`;

    // exceptions where the NSI key/value doesn't match the iD preset path key/value
    if (k === 'route')                              presetPath = `type/route/${v}`;
    if (k === 'highway' && v === 'bus_stop')        presetPath = 'public_transport/platform/bus_point';
    if (k === 'amenity' && v === 'ferry_terminal')  presetPath = 'public_transport/station_ferry';

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = tree.mainTag;

    // Primary/alternate names may be used as preset search terms
    const primaryName = new RegExp(tree.nameTags.primary, 'i');
    const alternateName = new RegExp(tree.nameTags.alternate, 'i');

    // There are a few exceptions to the name matching regexes.
    // Usually a tag suffix contains a language code like `name:en`, `name:ru`
    // but we want to exclude things like `operator:type`, `name:etymology`, etc..
    // NOTE: here we intentionally exclude `:wikidata`, in `matcher.js` we do not.
    const notName = /:(colour|type|left|right|etymology|pronunciation|wikipedia|wikidata)$/i;

    items.forEach(item => {
      const tags = item.tags;
      const qid = tags[wdTag];
      if (!qid || !/^Q\d+$/.test(qid)) return;   // wikidata tag missing or looks wrong..
      if (dissolved[item.id]) return;            // dissolved/closed businesses

      let presetID, preset;

      // Sometimes we can choose a more specific iD preset then `key/value`..
      // Attempt to match a `key/value/extravalue`
      const tryKeys = ['beauty', 'clothes', 'cuisine', 'healthcare:speciality', 'religion', 'social_facility', 'sport', 'vending'];
      tryKeys.forEach(osmkey => {
        if (preset) return;    // matched one already
        const val = tags[osmkey];
        if (!val) return;

        if (val === 'parcel_pickup;parcel_mail_in') {    // this one is just special
          presetID = `${presetPath}/parcel_pickup_dropoff`;
          preset = presetsJSON[presetID];
          if (preset) return;  // it matched
        }

        // keys like cuisine can contain multiple values, so try each one in order
        let vals = val.split(';');
        for (let i = 0; i < vals.length; i++) {
          presetID = presetPath + '/' + vals[i].trim();
          preset = presetsJSON[presetID];
          if (preset) return;   // it matched
        }
      });

      // fallback to `key/value`
      if (!preset) {
        presetID = presetPath;
        preset = presetsJSON[presetID];
      }

      // still no match?
      if (!preset) {
        missing.add(tkv);
        return;
      }

      // Gather search terms - include all primary/alternate names and matchNames
      // (There is similar code in lib/matcher.js)
      let terms = new Set(item.matchNames || []);
      Object.keys(tags).forEach(osmkey => {
        if (osmkey === 'name') return;      // exclude `name` tag, as iD prioritizes it above `preset.terms` already
        if (notName.test(osmkey)) return;   // osmkey is not a namelike tag, skip

        if (primaryName.test(osmkey) || alternateName.test(osmkey)) {
          terms.add(tags[osmkey].toLowerCase());
        }
      });

      // generate our target preset
      const targetID = `${presetID}/${item.id}`;

      let targetTags = {};
      targetTags[wdTag] = tags[wdTag]; // add the `*:wikidata` tag
      for (const k in preset.tags) {     // prioritize NSI tags over iD preset tags (for `vending`, `cuisine`, etc)
        targetTags[k] = tags[k] || preset.tags[k];
      }

      // Prefer a wiki commons logo sometimes.. openstreetmap/iD#6361
      const preferCommons = {
        Q177054: true,    // Burger King
        Q524757: true,    // KFC
        Q779845: true,    // CBA
        Q1205312: true,   // In-N-Out
        Q10443115: true   // Carlings
      };

      let logoURL;
      let logoURLs = wikidata[qid] && wikidata[qid].logos;
      if (logoURLs) {
        if (logoURLs.wikidata && preferCommons[qid]) {
          logoURL = logoURLs.wikidata;
        } else if (logoURLs.facebook) {
          logoURL = logoURLs.facebook;
        } else if (logoURLs.twitter) {
          logoURL = logoURLs.twitter;
        } else {
          logoURL = logoURLs.wikidata;
        }
      }

      // Special rule for "name" fields:
      // If we're preserving the `name` tag, make sure both "name" and "brand" fields are shown.
      // This triggers iD to lock the "brand" field but allow edits to the "name" field.
      const preserveTags = item.preserveTags || properties.preserveTags || [];
      let fields;
      if (t === 'brands' && preserveTags.some(s => s === '^name')) {
        fields = ['name', 'brand', `{${presetID}}`];
      } else if (t === 'operators' && preserveTags.some(s => s === '^name')) {
        fields = ['name', 'operator', `{${presetID}}`];
      }

      let targetPreset = {
        name: item.displayName,
        locationSet: item.locationSet,
        icon: preset.icon,
        geometry: preset.geometry,
        matchScore: 2
      };

      if (logoURL)           targetPreset.imageURL = logoURL;
      if (terms.size)        targetPreset.terms = Array.from(terms).sort(withLocale);
      if (fields)            targetPreset.fields = fields;
      if (preset.reference)  targetPreset.reference = preset.reference;
      targetPreset.tags = sortObject(targetTags);
      targetPreset.addTags = sortObject(item.tags);

      targetPresets[targetID] = targetPreset;
    });
  });

  missing.forEach(tkv => {
    console.warn(colors.yellow(`Warning - no iD source preset found for ${tkv}`));
  });

  let output = { presets: targetPresets };
  writeFileWithMeta('dist/presets/nsi-id-presets.json', stringify(output) + '\n');
}


// `buildJOSMPresets()`
// Create JOSM presets using the tree/key/value structure
// to organize the presets into JOSM preset groups.
// See:  https://josm.openstreetmap.de/wiki/TaggingPresets
function buildJOSMPresets() {
  let root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  let presets = root.ele('presets')
    .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
    .att('author', 'Name Suggestion Index')
    .att('shortdescription', 'Name Suggestion Index')
    .att('description', packageJSON.description)
    .att('link', 'https://github.com/' + packageJSON.repository)
    .att('version', packageJSON.version);

  let topGroup = presets
    .ele('group')
    .att('name', 'Name Suggestion Index');

  let tPrev, kPrev, vPrev;
  let tGroup, kGroup, vGroup;

  const paths = Object.keys(_cache.path).sort(withLocale);
  paths.forEach(tkv => {
    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = trees[t].mainTag;

    // Include only items that have a wikidata tag and are not dissolved..
    let items = (_cache.path[tkv].items || [])
      .filter(item => {
        const qid = item.tags[wdTag];
        if (!qid || !/^Q\d+$/.test(qid)) return false;   // wikidata tag missing or looks wrong..
        if (dissolved[item.id]) return false;            // dissolved/closed businesses..
        return true;
      });

    if (!items.length) return;  // skip this path

    // Create new menu groups as t/k/v change
    if (t !== tPrev)  tGroup = topGroup.ele('group').att('name', t);
    if (k !== kPrev)  kGroup = tGroup.ele('group').att('name', k);
    if (v !== vPrev)  vGroup = kGroup.ele('group').att('name', v);

    items.forEach(item => {
      let preset = vGroup
        .ele('item')
        .att('name', item.displayName)
        .att('type', 'node,closedway,multipolygon');

      for (const osmkey in item.tags) {
        preset.ele('key').att('key', osmkey).att('value', item.tags[osmkey]);
      }
    });

    tPrev = t;
    kPrev = k;
    vPrev = v;
  });

  fs.writeFileSync('dist/presets/nsi-josm-presets.xml', root.end({ prettyPrint: true }));
  fs.writeFileSync('dist/presets/nsi-josm-presets.min.xml', root.end());
}


// `buildTaginfo()`
// Create a taginfo project file
// See:  https://wiki.openstreetmap.org/wiki/Taginfo/Projects
function buildTaginfo() {
  const distURL = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist';
  let taginfo = {
    'data_format': 1,
    'data_url': `${distURL}/taginfo.json`,
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical features for OpenStreetMap',
      'project_url': 'https://github.com/osmlab/name-suggestion-index',
      'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/main/README.md',
      'icon_url': 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/fastr-food-15.svg',
      'contact_name': 'Bryan Housel',
      'contact_email': 'bhousel@gmail.com'
    }
  };

  // collect all tag pairs
  let tagPairs = {};
  _cache.id.forEach(item => {
    for (const k in item.tags) {
      let v = item.tags[k];

      // Don't export every value for many tags this project uses..
      // ('tag matches any of these')(?!('not followed by :type'))
      if (/(brand|country|flag|name|network|operator|owner|subject)(?!(:type))/.test(k)) {
        v = '*';
      }

      const kv = `${k}/${v}`;
      tagPairs[kv] = { key: k };

      if (v !== '*') {
        tagPairs[kv].value = v;
      }
    }
  });

  taginfo.tags = Object.keys(tagPairs).sort(withLocale).map(kv => tagPairs[kv]);
  fs.writeFileSync('dist/taginfo.json', stringify(taginfo, { maxLength: 100 }) + '\n');
}


// `buildSitemap()`
// Create the sitemap for https://nsi.guide
// See:  https://en.wikipedia.org/wiki/Sitemaps
function buildSitemap() {
  const changefreq = 'weekly';
  const lastmod = (new Date()).toISOString();

  let root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  let urlset = root.ele('urlset').att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

  let index = urlset.ele('url');
  index.ele('loc').txt('https://nsi.guide/index.html');
  index.ele('changefreq').txt(changefreq);
  index.ele('lastmod').txt(lastmod);

  // collect all paths
  const paths = Object.keys(_cache.path).sort(withLocale);
  paths.forEach(tkv => {
    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];

    let url = urlset.ele('url');
    url.ele('loc').txt(`https://nsi.guide/index.html?t=${t}&k=${k}&v=${v}`);
    url.ele('changefreq').txt(changefreq);
    url.ele('lastmod').txt(lastmod);
  });

  fs.writeFileSync('docs/sitemap.xml', root.end({ prettyPrint: true }));
}


// `minifySync()`
// minifies a file
function minifySync(inPath, outPath) {
  try {
    const contents = fs.readFileSync(inPath, 'utf8');
    const minified = JSON.stringify(JSON5.parse(contents));
    fs.writeFileSync(outPath, minified);
  } catch (err) {
    console.error(colors.red(`Error - ${err.message} minifying:`));
    console.error('  ' + colors.yellow(inPath));
    process.exit(1);
  }
}
