import { $ } from 'bun';
import localeCompare from 'locale-compare';
import LocationConflation from '@rapideditor/location-conflation';
import stringify from 'json-stringify-pretty-compact';
import { styleText } from 'bun:util';
import xmlbuilder2 from 'xmlbuilder2';
const withLocale = localeCompare('en-US');

import { fileTree } from '../lib/file_tree.ts';
import { sortObject } from '../lib/sort_object.ts';

// JSON
const packageJSON = await Bun.file('./package.json').json();
const treesJSON = await Bun.file('./config/trees.json').json();
let featureCollectionJSON;
try {
  featureCollectionJSON = await Bun.file('./dist/json/featureCollection.json').json();
} catch (err) {
  console.error(styleText('red', `Error: ${err.message} `));
  console.error(styleText('yellow', `Please run 'bun run build' first.`));
  process.exit(1);
}
let dissolvedJSON;
let wikidataJSON;
try {
  dissolvedJSON = await Bun.file('./dist/wikidata/dissolved.json').json();
  wikidataJSON = await Bun.file('./dist/wikidata/wikidata.json').json();
} catch (err) {
  console.error(styleText('red', `Error: ${err.message} `));
  console.error(styleText('yellow', `Please run 'bun run wikidata' first.`));
  process.exit(1);
}

const dissolved = dissolvedJSON.dissolved;
const trees = treesJSON.trees;
const wikidata = wikidataJSON.wikidata;

// iD's presets which we will build on
const presetsFile = './node_modules/@openstreetmap/id-tagging-schema/dist/presets.json';
const presetsJSON = await Bun.file(presetsFile).json();

// We use LocationConflation for validating and processing the locationSets
const _loco = new LocationConflation(featureCollectionJSON);
const _nsi = {};


await loadIndex();
await distAll();


// Load the index files under `./data/*`
async function loadIndex() {
  const START = '🏗   ' + styleText('yellow', `Loading index files…`);
  const END = '👍  ' + styleText('green', `done loading`);
  console.log(START);
  console.time(END);

  await fileTree.read(_nsi, _loco);
  fileTree.expandTemplates(_nsi, _loco);
  console.timeEnd(END);
}


// Generate the files under `./dist/*`
async function distAll() {
  const START = '🏗   ' + styleText('yellow', 'Building data...');
  const END = '👍  ' + styleText('green', 'data built');

  console.log('');
  console.log(START);
  console.time(END);

  await updateVersion();

  // Copy files from `./config` to `./dist/json`
  await $`cp -f ./config/genericWords.json  ./dist/json`;
  await $`cp -f ./config/matchGroups.json  ./dist/json`;
  await $`cp -f ./config/replacements.json  ./dist/json`;
  await $`cp -f ./config/trees.json  ./dist/json`;

  // Write `nsi.json` as a single file containing everything by path
  // Reverse sort the paths, we want 'brands' to override 'operators'
  // see: https://github.com/osmlab/name-suggestion-index/issues/5693#issuecomment-2819259226
  const sorted = {};
  Object.keys(_nsi.path).sort((a, b) => withLocale(b, a)).forEach(tkv => {
    sorted[tkv] = _nsi.path[tkv];
  });

  const output = { nsi: sorted };
  await Bun.write('./dist/json/nsi.json', stringify(output, { maxLength: 800 }) + '\n');

  await buildIDPresets();     // nsi-id-presets.json
  await buildJOSMPresets();   // nsi-josm-presets.json
  await buildTaginfo();       // taginfo.json
  // await buildSitemap();  // lets not do this for now (maybe nsiguide can generate it?)
}


// Update the project version
async function updateVersion() {
  // Bump the project version..
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = ('0' + (now.getUTCMonth() + 1)).slice(-2);
  const dd = ('0' + now.getUTCDate()).slice(-2);

  const oldVersion = packageJSON.version;
  let newVersion;
  const match = packageJSON.version.match(/^(\d+)\.(\d+)/);
  if (match[1] && match[2]) {
    newVersion = `${match[1]}.${match[2]}.${yyyy}${mm}${dd}`;
  }
  if (!newVersion) {
    throw new Error(`Error:  Invalid 'package.json' version: ${oldVersion}`);
  }

  if (newVersion !== oldVersion) {
    console.log('🎉  ' + styleText('green', 'Bumping package version to ') + styleText(['green','bold'], `v${newVersion}`));
    packageJSON.version = newVersion;
    await $`bun pm pkg set version="${newVersion}"`;
  }
}


// build iD presets
// https://github.com/openstreetmap/id-tagging-schema
async function buildIDPresets() {
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

  const targetPresets = {};
  const missing = new Set();
  const paths = Object.keys(_nsi.path);

  // Ferry hack! ⛴
  // Append a duplicate tkv for Ferry routes so we can generate them twice..
  // These actually exist as 2 iD presets:
  // `type/route/ferry` - for a Route Relation
  // `route/ferry` - for a Way
  let ferryCount = 0;
  if (_nsi.path['transit/route/ferry']) {
    paths.push('transit/route/ferry');   // add a duplicate tkv
  }

  for (const tkv of paths.sort(withLocale)) {
    const properties = _nsi.path[tkv].properties || {};
    const items = _nsi.path[tkv].items;
    if (!Array.isArray(items) || !items.length) continue;

    const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
    const tree = trees[t];
    const kv = `${k}/${v}`;

    let presetPath = kv;

    // Exceptions where the NSI `key/value` doesn't match the iD preset path `key/value`
    // See also https://github.com/openstreetmap/iD/issues/11527
    // id-tagging-schema occasionally moves their presets around, changing their presetIDs.
    if (k === 'route')                     presetPath = `type/route/${v}`;   // Route Relation
    if (kv === 'highway/bus_stop')         presetPath = 'public_transport/platform/bus_point';
    if (kv === 'amenity/ferry_terminal')   presetPath = 'public_transport/station_ferry';
    if (kv === 'amenity/college')          presetPath = 'education/college';
    if (kv === 'amenity/driving_school')   presetPath = 'education/driving_school';
    if (kv === 'amenity/dancing_school')   presetPath = 'education/dancing_school';
    if (kv === 'amenity/kindergarten')     presetPath = 'education/kindergarten';
    if (kv === 'amenity/language_school')  presetPath = 'education/language_school';
    if (kv === 'amenity/music_school')     presetPath = 'education/music_school';
    if (kv === 'amenity/prep_school')      presetPath = 'education/prep_school';
    if (kv === 'amenity/school')           presetPath = 'education/school';
    if (kv === 'amenity/university')       presetPath = 'education/university';
    if (kv === 'emergency/water_rescue')   presetPath = 'emergency/lifeboat_station';

    // Ferry hack! ⛴
    if (tkv === 'transit/route/ferry') {
      if (!ferryCount++) {
        presetPath = 'type/route/ferry';  // Route Relation
      } else {
        presetPath = 'route/ferry';  // Way
      }
    }

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = tree.mainTag;

    // Primary/alternate names may be used as preset search terms
    const primaryName = new RegExp(tree.nameTags.primary, 'i');
    const alternateName = new RegExp(tree.nameTags.alternate, 'i');

    // There are a few exceptions to the name matching regexes.
    // Usually a tag suffix contains a language code like `name:en`, `name:ru`
    // but we want to exclude things like `operator:type`, `name:etymology`, etc..
    // NOTE: here we intentionally exclude `:wikidata`, in `matcher.ts` we do not.
    const notName = /:(colour|type|left|right|etymology|pronunciation|wikipedia|wikidata)$/i;

    const childPresets = new Map();
    for (const checkPath in presetsJSON) {
      if (checkPath.startsWith(presetPath)) {
        childPresets.set(checkPath, presetsJSON[checkPath]);
      }
    }

    for (const item of items) {
      const tags = item.tags;
      const qid = tags[wdTag];
      if (!qid || !/^Q\d+$/.test(qid)) continue;   // wikidata tag missing or looks wrong..

      let presetID, preset;

      // Sometimes we can choose a more specific iD preset then `key/value`..
      // Attempt to match a `key/value/extravalue`
      if (childPresets.size > 1) {
        // The best iD preset for an NSI entry is determined by count of tags that have
        // matched (more is better) and position for multi-value tags (e.g. cuisine)
        let matchTagsCount = 0;
        let matchSemicolonRating = 0;

        let matchPresetPath;
        let matchPreset;

        childPresets.forEach((checkPreset, checkPresetPath) => {
          const checkPresetTags = Object.entries(checkPreset.tags);
          let currentMatchSemicolonRating = 0;

          const isPresetMatch = checkPresetTags.every(kv => {
            // Tags that NSI allows to process as multi-valued
            const semicolonSplittedKeys = ['beauty', 'clothes', 'cuisine', 'healthcare:speciality', 'social_facility', 'sport', 'vending', 'waste'];
            const idKey = kv[0];
            const idVal = kv[1];

            const nsiVal = tags[idKey];
            if (!nsiVal) {
              return false;
            }
            if (semicolonSplittedKeys.includes(idKey)) {
              const vals = nsiVal.split(';');
              const findResult = vals.indexOf(idVal);
              if (-1 === findResult) {
                return false;
              }
              // For a smaller element index rating will be higher
              currentMatchSemicolonRating -= findResult;
              return true;
            }
            return (idVal === nsiVal);
          });

          // If rating of current element is higher than the saved one, we overwrite saved
          if (isPresetMatch
            && ((checkPresetTags.length > matchTagsCount)
              || (checkPresetTags.length === matchTagsCount
                && currentMatchSemicolonRating > matchSemicolonRating))) {
            matchTagsCount = checkPresetTags.length;
            matchSemicolonRating = currentMatchSemicolonRating;
            matchPresetPath = checkPresetPath;
            matchPreset = checkPreset;
          }
        });

        console.assert('Preset must already be selected', matchPresetPath);
        presetID = matchPresetPath;
        preset = matchPreset;
      }

      // fallback to `key/value`
      if (!preset && childPresets.size === 1) {
        const presetKV = childPresets.entries().next().value;
        presetID = presetKV[0];
        preset = presetKV[1];
      }

      // still no match?
      // fallback to generic like `amenity/yes`, `shop/yes`
      if (!preset) {
        presetID = k;
        preset = presetsJSON[presetID];
        missing.add(tkv);
      }
      // *still* no match?
      // bail out of this category
      if (!preset) {
        continue;
      }

      // Gather search terms - include all primary/alternate names and matchNames
      // (There is similar code in lib/matcher.ts)
      const terms = new Set(item.matchNames || []);
      for (const osmkey of Object.keys(tags)) {
        if (osmkey === 'name') continue;      // exclude `name` tag, as iD prioritizes it above `preset.terms` already
        if (notName.test(osmkey)) continue;   // osmkey is not a namelike tag, skip

        if (primaryName.test(osmkey) || alternateName.test(osmkey)) {
          terms.add(tags[osmkey].toLowerCase());
        }
      }

      // generate our target preset
      const targetID = `${presetID}/${item.id}`;

      const targetTags = {};
      targetTags[wdTag] = tags[wdTag]; // add the `*:wikidata` tag
      for (const k in preset.tags) {     // prioritize NSI tags over iD preset tags (for `vending`, `cuisine`, etc)
        targetTags[k] = tags[k] || preset.tags[k];
      }

      // Prefer a wiki commons logo sometimes..
      // Related issues list: openstreetmap/iD#6361, #2798, #3122, #8042, #8373
      const preferCommons = {
        Q177054: true,    // Burger King
        Q524757: true,    // KFC
        Q779845: true,    // CBA
        Q1205312: true,   // In-N-Out
        Q10443115: true,   // Carlings
        Q38076: true   // McDonald's
      };

      let logoURL;
      const logoURLs = wikidata[qid] && wikidata[qid].logos;
      if (logoURLs) {
        if (logoURLs.wikidata && preferCommons[qid]) {
          logoURL = logoURLs.wikidata;
        } else if (logoURLs.facebook) {
          logoURL = logoURLs.facebook;
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

      const targetPreset = {
        name: item.displayName,
        locationSet: item.locationSet,
        icon: preset.icon,
        geometry: preset.geometry,
        matchScore: 2
      };

      if (logoURL)             targetPreset.imageURL = logoURL;
      if (terms.size)          targetPreset.terms = Array.from(terms).sort(withLocale);
      if (fields)              targetPreset.fields = fields;
      if (preset.reference)    targetPreset.reference = preset.reference;
      if (dissolved[item.id])  targetPreset.searchable = false;  // dissolved/closed businesses
      if (preserveTags.length) targetPreset.preserveTags = preserveTags; // #10083

      targetPreset.tags = sortObject(targetTags);
      targetPreset.addTags = sortObject(Object.assign({}, item.tags, targetTags));

      targetPresets[targetID] = targetPreset;
    }
  }

  if ( missing.size > 0 ) {
    console.log(styleText('yellow', `\n⚠️  Category files without presets at @openstreetmap/id-tagging-schema for their key-value combination:`));
    for (const tkv of missing) {
      console.log(`* no iD source preset found for ${tkv}`);
    }
  }

  const output = { presets: targetPresets };
  await Bun.write('./dist/presets/nsi-id-presets.json', stringify(output) + '\n');
}


// `buildJOSMPresets()`
// Create JOSM presets using the tree/key/value structure
// to organize the presets into JOSM preset groups.
// See:  https://josm.openstreetmap.de/wiki/TaggingPresets
async function buildJOSMPresets() {
  const root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  const presets = root.ele('presets')
    .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
    .att('author', 'Name Suggestion Index')
    .att('shortdescription', 'Name Suggestion Index')
    .att('description', packageJSON.description)
    .att('link', 'https://github.com/osmlab/name-suggestion-index')
    .att('version', packageJSON.version);

  const topGroup = presets
    .ele('group')
    .att('name', 'Name Suggestion Index');

  let tPrev, kPrev, vPrev;
  let tGroup, kGroup, vGroup;

  const paths = Object.keys(_nsi.path).sort(withLocale);
  for (const tkv of paths) {
    const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = trees[t].mainTag;

    // Include only items that have a wikidata tag and are not dissolved..
    const items = (_nsi.path[tkv].items || [])
      .filter(item => {
        const qid = item.tags[wdTag];
        if (!qid || !/^Q\d+$/.test(qid)) return false;   // wikidata tag missing or looks wrong..
        if (dissolved[item.id]) return false;            // dissolved/closed businesses..
        return true;
      });

    if (!items.length) continue;  // skip this path

    // Create new menu groups as t/k/v change
    if (t !== tPrev)  tGroup = topGroup.ele('group').att('name', t);
    if (k !== kPrev)  kGroup = tGroup.ele('group').att('name', k);
    if (v !== vPrev)  vGroup = kGroup.ele('group').att('name', v);

    // Choose allowable geometries for the category
    let presetType;
    if (t === 'flags') {
      presetType = 'node';
    } else if (k === 'route') {
      if (v === 'ferry') {  // Ferry hack! ⛴
        presetType = 'way,closedway,relation';
      } else {
        presetType = 'relation';
      }
    } else if (k === 'power' && (v === 'line' || v === 'minor_line')) {
      presetType = 'way,closedway';
    } else if (k === 'power' && (v === 'pole' || v === 'tower')) {
      presetType = 'node';
    } else {
      presetType = 'node,closedway,multipolygon';   // default for POIs
    }

    for (const item of items) {
      const preset = vGroup
        .ele('item')
        .att('name', item.displayName)
        .att('type', presetType);

      for (const [osmkey, osmvalue] of Object.entries(item.tags)) {
        preset.ele('key').att('key', osmkey).att('value', osmvalue);
      }
    }

    tPrev = t;
    kPrev = k;
    vPrev = v;
  }

  await Bun.write('./dist/presets/nsi-josm-presets.xml', root.end({ prettyPrint: true }));
  await Bun.write('./dist/presets/nsi-josm-presets.min.xml', root.end());
}


// `buildTaginfo()`
// Create a taginfo project file
// See:  https://wiki.openstreetmap.org/wiki/Taginfo/Projects
async function buildTaginfo() {
  const taginfo = {
    'data_format': 1,
    'data_url': 'https://cdn.jsdelivr.net/npm/name-suggestion-index@latest/dist/json/taginfo.json',
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical features for OpenStreetMap',
      'project_url': 'https://github.com/osmlab/name-suggestion-index',
      'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/main/README.md',
      'icon_url': 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/fast-food-15.svg',
      'contact_name': 'Bryan Housel',
      'contact_email': 'bhousel@gmail.com'
    }
  };

  // collect all tag pairs
  const tagPairs = {};
  for (const path in _nsi.path) {
    for (const item of _nsi.path[path].items) {
      for (const k in item.tags) {
        let v = item.tags[k];

        // Don't export every value for many tags this project uses..
        // ('tag matches any of these')(?!('not followed by :type'))
        if (/(bic|brand|brewery|country|flag|internet_access:ssid|max_age|min_age|name|network|operator|owner|ref|subject)(?!(:type))/.test(k)) {
          v = '*';
        }

        const kv = `${k}/${v}`;
        tagPairs[kv] ||= { key: k };

        if (v !== '*') {
          tagPairs[kv].value = v;
          const [_, kPreset, vPreset] = path.split('/');
          if (k === kPreset && v === vPreset) {
            tagPairs[kv].doc_url = `${packageJSON.homepage}/?k=${k}&v=${v}`;
          }
        }
      }
    }
  }

  taginfo.tags = Object.keys(tagPairs).sort(withLocale).map(kv => tagPairs[kv]);
  await Bun.write('./dist/json/taginfo.json', stringify(taginfo, { maxLength: 9999 }) + '\n');
}


// `buildSitemap()`
// Create the sitemap for https://nsi.guide
// See:  https://en.wikipedia.org/wiki/Sitemaps
async function buildSitemap() {
  const changefreq = 'weekly';
  const lastmod = (new Date()).toISOString();

  const root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  const urlset = root.ele('urlset').att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

  const index = urlset.ele('url');
  index.ele('loc').txt('https://nsi.guide/index.html');
  index.ele('changefreq').txt(changefreq);
  index.ele('lastmod').txt(lastmod);

  // collect all paths
  const paths = Object.keys(_nsi.path).sort(withLocale);
  for (const tkv of paths) {
    const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
    const url = urlset.ele('url');
    url.ele('loc').txt(`https://nsi.guide/index.html?t=${t}&k=${k}&v=${v}`);
    url.ele('changefreq').txt(changefreq);
    url.ele('lastmod').txt(lastmod);
  }

  await Bun.write('./docs/sitemap.xml', root.end({ prettyPrint: true }));
}
