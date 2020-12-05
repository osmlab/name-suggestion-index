const colors = require('colors/safe');
const fs = require('fs');
const glob = require('glob');
const dissolved = require('../dist/dissolved.json');
const fileTree = require('../lib/file_tree.js');
const JSON5 = require('json5');
const packageJSON = require('../package.json');
const prettyStringify = require('json-stringify-pretty-compact');
const shell = require('shelljs');
const sort = require('../lib/sort.js');
const wikidata = require('../dist/wikidata.json').wikidata;
const xmlbuilder2 = require('xmlbuilder2');

// iD's presets which we will build on
const sourcePresets = require('@openstreetmap/id-tagging-schema/dist/presets.json');

// metadata about the trees
const trees = require('../config/trees.json').trees;

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);


let _cache = {};
fileTree.read(_cache, loco);
fileTree.expandTemplates(_cache, loco);
_cache.path = sort(_cache.path);

buildAll();


function buildAll() {
  const START = '🏗   ' + colors.yellow('Building data...');
  const END = '👍  ' + colors.green('data built');

  console.log('');
  console.log(START);
  console.time(END);


  // Start clean
  shell.rm('-f', [
    'docs/sitemap.xml',
    'dist/index.json',
    'dist/taginfo.json',
    'dist/presets/*',
    'dist/*.min.json',
    'dist/collected/*.min.json',
    'dist/filtered/*.min.json'
  ]);

  // Copy some project config files into `/dist`
  shell.cp('-f', 'config/genericWords.json', 'dist/genericWords.json');
  shell.cp('-f', 'config/match_groups.json', 'dist/match_groups.json');
  shell.cp('-f', 'config/replacements.json', 'dist/replacements.json');
  shell.cp('-f', 'config/trees.json', 'dist/trees.json');

  // Write `index.json` as a single file containing everything by path
  fs.writeFileSync('dist/index.json', prettyStringify(_cache.path, { maxLength: 800 }));

  buildJSON();     // nsi-id-presets.json
  buildXML();      // nsi-josm-presets.json
  buildTaginfo();
  buildSitemap();

  // minify all .json files under dist/
  glob.sync(`dist/**/*.json`).forEach(file => {
    const minFile = file.replace('.json', '.min.json');
    minifySync(file, minFile);
  });
}


function buildJSON() {
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

  const paths = Object.keys(_cache.path);
  paths.sort().forEach(tkv => {
    let items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    let t = parts[0];
    let k = parts[1];
    let v = parts[2];

    // exception where the NSI key/value doesn't match the iD key/value
    if (k === 'route') k = 'type/route';

    let kv = `${k}/${v}`;


    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = trees[t].mainTag;

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
          presetID = `${kv}/parcel_pickup_dropoff`;
          preset = sourcePresets[presetID];
          if (preset) return;  // it matched
        }

        // keys like cuisine can contain multiple values, so try each one in order
        let vals = val.split(';');
        for (let i = 0; i < vals.length; i++) {
          presetID = kv + '/' + vals[i].trim();
          preset = sourcePresets[presetID];
          if (preset) return;   // it matched
        }
      });

      // fallback to `key/value`
      if (!preset) {
        presetID = kv;
        preset = sourcePresets[presetID];
      }

      // still no match?
      if (!preset) {
        missing.add(tkv);
        return;
      }

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

      let targetPreset = {
        name: item.displayName,
        locationSet: item.locationSet,
        icon: preset.icon,
        geometry: preset.geometry,
        matchScore: 2
      };

      if (logoURL)           targetPreset.imageURL = logoURL;
      if (item.matchNames)   targetPreset.terms = item.matchNames;
      if (preset.reference)  targetPreset.reference = preset.reference;
      targetPreset.tags = sort(targetTags);
      targetPreset.addTags = sort(item.tags);

      targetPresets[targetID] = targetPreset;
    });
  });

  missing.forEach(tkv => {
    console.warn(colors.yellow(`Warning - no iD source preset found for ${tkv}`));
  });

  fs.writeFileSync('dist/presets/nsi-id-presets.json', prettyStringify(targetPresets));
}


// Create JOSM presets using the tree/key/value structure
// to organize the presets into JOSM preset groups.
function buildXML() {
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

  const paths = Object.keys(_cache.path);
  paths.sort().forEach(tkv => {
    let items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    let t = parts[0];
    let k = parts[1];
    let v = parts[2];

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = trees[t].mainTag;

    // Create new menu groups as t/k/v change
    if (t !== tPrev)  tGroup = topGroup.ele('group').att('name', t);
    if (k !== kPrev)  kGroup = tGroup.ele('group').att('name', k);
    if (v !== vPrev)  vGroup = kGroup.ele('group').att('name', v);

    items.forEach(item => {
      const tags = item.tags;
      const qid = tags[wdTag];
      if (!qid || !/^Q\d+$/.test(qid)) return;   // wikidata tag missing or looks wrong..
      if (dissolved[item.id]) return;            // dissolved/closed businesses

      let preset = vGroup
        .ele('item')
        .att('name', item.displayName)
        .att('type', 'node,closedway,multipolygon');

      for (const osmkey in tags) {
        preset.ele('key').att('key', osmkey).att('value', tags[osmkey]);
      }
    });

    tPrev = t;
    kPrev = k;
    vPrev = v;
  });

  fs.writeFileSync('dist/presets/nsi-josm-presets.xml', root.end({ prettyPrint: true }));
  fs.writeFileSync('dist/presets/nsi-josm-presets.min.xml', root.end());
}


function buildTaginfo() {
  let taginfo = {
    'data_format': 1,
    'data_url': 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist/taginfo.json',
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
  Object.values(_cache.id).filter(item => {
    for (const k in item.tags) {
      let v = item.tags[k];

      // Don't export every value for many tags this project uses..
      // ('tag matches any of these')(?!('not followed by :type'))
      if (/(brand|country|flag|name|network|operator|subject)(?!(:type))/.test(k)) {
        v = '*';
      }

      const kv = `${k}/${v}`;
      tagPairs[kv] = { key: k };

      if (v !== '*') {
        tagPairs[kv].value = v;
      }
    }
  });

  taginfo.tags = Object.keys(tagPairs).sort().map(kv => tagPairs[kv]);
  fs.writeFileSync('dist/taginfo.json', prettyStringify(taginfo, { maxLength: 100 }));
}


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
  Object.keys(_cache.path).filter(tkv => {
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