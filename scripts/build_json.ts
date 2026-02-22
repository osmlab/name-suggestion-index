//import geojsonArea from '@mapbox/geojson-area';
//import geojsonBounds from 'geojson-bounds';
import geojsonPrecision from 'geojson-precision';
import geojsonRewind from '@mapbox/geojson-rewind';
import { Glob } from 'bun';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import LocationConflation from '@rapideditor/location-conflation';
import path from 'node:path';
import safeRegex from 'safe-regex';
import stringify from 'json-stringify-pretty-compact';
import { styleText } from 'bun:util';
import { Validator } from 'jsonschema';
const withLocale = localeCompare('en-US');

import { fileTree } from '../lib/file_tree.ts';
import { idgen } from '../lib/idgen.ts';
import { Matcher } from '../lib/matcher.ts';
import { simplify } from '../lib/simplify.ts';
import { sortObject } from '../lib/sort_object.ts';
// import { stemmer } from '../lib/stemmer.ts';
import { validate } from '../lib/validate.ts';

const matcher = new Matcher();
const validator = new Validator();

const _config = {};
const _nsi = {};
const _collected = {};
const _discard = {};
const _keep = {};
let _loco = null;


await buildAll();

async function buildAll() {
  // GeoJSON features
  console.log('');
  console.log(styleText('blue', '-'.repeat(70)));
  console.log(styleText('blue', 'GeoJSON features'));
  console.log(styleText('blue', '-'.repeat(70)));

  const featureCollection = await buildFeatureCollection();
  // We use LocationConflation for validating and processing the locationSets
  _loco = new LocationConflation(featureCollection);


  // NSI Data
  console.log('');
  console.log(styleText('blue', '-'.repeat(70)));
  console.log(styleText('blue', 'NSI Data'));
  console.log(styleText('blue', '-'.repeat(70)));

  await loadConfig();
  await loadIndex();

  console.log('');
  console.log('🏗   ' + styleText('yellow', `Running checks…`));
  checkItems('brands');
  checkItems('flags');
  checkItems('operators');
  checkItems('transit');

  console.log('');
  await loadCollected();
  await filterCollected();

  console.log('');
  mergeItems();

  console.log('');
  await saveIndex();
}


//
//
async function buildFeatureCollection() {
  const START = '🏗   ' + styleText('yellow', 'Building features...');
  const END = '👍  ' + styleText('green', 'features built');
  console.log(START);
  console.time(END);

  const features = await loadFeatures();
  const featureCollection = { type: 'FeatureCollection', features: features };
  const stringified = stringify(featureCollection, { maxLength: 9999 }) + '\n';
  await Bun.write('./dist/json/featureCollection.json', stringified);

  console.timeEnd(END);
  return featureCollection;
}


// Gather feature files from `./features/**/*.geojson`
async function loadFeatures() {
  const featureSchemaJSON = await Bun.file('./schema/feature.json').json();
  const geojsonSchemaJSON = await Bun.file('./schema/geojson.json').json();
  validator.addSchema(geojsonSchemaJSON, 'http://json.schemastore.org/geojson.json');

  const features = [];
  const seen = new Map();   // Map<id, filepath>

  const glob = new Glob('./features/**/*');
  for (const filepath of glob.scanSync()) {
    if (/\.md$/i.test(filepath)) continue;   // ignore markdown files
    if (!/\.geojson$/.test(filepath)) {
      console.error(styleText('red', `Error - file should have a .geojson extension:`));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }

    const contents = await Bun.file(filepath).text();
    let parsed;
    try {
      parsed = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(styleText('red', `Error - ${jsonParseError.message} in:`));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }

    let feature = geojsonPrecision(geojsonRewind(parsed, true), 5);
    const fc = feature.features;

    // A FeatureCollection with a single feature inside (geojson.io likes to make these).
    if (feature.type === 'FeatureCollection' && Array.isArray(fc) && fc.length === 1) {
      feature = fc[0];
    }

//    // Warn if this feature is so small it would better be represented as a circular area.
//    let area = geojsonArea.geometry(feature.geometry) / 1e6;   // m² to km²
//    area = Number(area.toFixed(2));
//    if (area < 2000) {
//      const extent = geojsonBounds.extent(feature);
//      const lon = ((extent[0] + extent[2]) / 2).toFixed(4);
//      const lat = ((extent[1] + extent[3]) / 2).toFixed(4);
//      console.warn('');
//      console.warn(styleText('yellow', `Warning for ` + styleText('yellow', filepath) + `:`));
//      console.warn(styleText('yellow', `GeoJSON feature for small area (${area} km²).  Consider circular include location instead: [${lon}, ${lat}]`));
//    }

    // use the filename as the feature.id
    const id = path.basename(filepath).toLowerCase();
    feature.id = id;

    // sort properties
    const obj = {};
    if (feature.type)       { obj.type = feature.type; }
    if (feature.id)         { obj.id = feature.id; }
    if (feature.properties) { obj.properties = feature.properties; }

    // validate that the feature has a suitable geometry
    if (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon') {
      console.error(styleText('red', 'Error - Feature type must be "Polygon" or "MultiPolygon" in:'));
      console.error('  ' + styleText('yellow', filepath));
      process.exit(1);
    }
    if (!feature.geometry?.coordinates) {
      console.error(styleText('red', 'Error - Feature missing coordinates in:'));
      console.error('  ' + styleText('yellow', filepath));
      process.exit(1);
    }
    obj.geometry = {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates
    };

    feature = obj;

    // check JSON schema
    validate(validator, filepath, feature, featureSchemaJSON);

    // prettify file
    const pretty = stringify(feature, { maxLength: 100 }) + '\n';
    if (pretty !== contents) {
      await Bun.write(filepath, pretty);
    }

    if (seen.has(id)) {
      console.error(styleText('red', 'Error - Duplicate filenames: ') + styleText('yellow', id));
      console.error(styleText('yellow', '  ' + seen.get(id)));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }
    features.push(feature);
    seen.set(id, filepath);
  }

  // sort features by id, see: 800ca866f
  features.sort((a, b) => withLocale(a.id, b.id));

  console.log(`🧩  features:\tLoaded ${features.length} features`);
  return features;
}


//
// Load, validate, cleanup config files
//
async function loadConfig() {
  for (const which of ['trees', 'replacements', 'genericWords']) {
    const schema = await Bun.file(`./schema/${which}.json`).json();
    const filepath = `config/${which}.json`;
    const data = await Bun.file(filepath).json();

    // check JSON schema
    validate(validator, filepath, data, schema);

    // check regexes
    if (which === 'trees') {
      Object.values(data.trees).forEach(tree => {
        checkRegex(filepath, tree.nameTags.primary);
        checkRegex(filepath, tree.nameTags.alternate);
      });
    } else if (which === 'genericWords') {
      Object.values(data.genericWords).forEach(pattern => checkRegex(filepath, pattern));
    }

    // Clean and order the files for consistency, save them that way.
    if (which === 'trees') {
      for (const [t, obj] of Object.entries(data.trees)) {
        const cleaned = {
          emoji:       obj.emoji,
          mainTag:     obj.mainTag,
          sourceTags:  obj.sourceTags,
          nameTags: {
            primary:   obj.nameTags.primary,
            alternate: obj.nameTags.alternate,
          }
        };
        data.trees[t] = cleaned;
      }
      data.trees = sortObject(data.trees);

    } else if (which === 'replacements') {
      for (const [qid, obj] of Object.entries(data.replacements)) {
        const cleaned = {
          note:      obj.note,
          wikidata:  obj.wikidata
        };
        data.replacements[qid] = cleaned;
      }
      data.replacements = sortObject(data.replacements);

    } else if (which === 'genericWords') {
      data.genericWords = data.genericWords.map(s => {
        if (/İ/.test(s)) {   // Avoid toLowerCasing this one, it changes - #8261
          return s.trim();
        } else {
          return s.trim().toLowerCase();
        }
      })
      .sort(withLocale);
    }

    // Lowercase and sort the files for consistency, save them that way.
    await Bun.write(filepath, stringify(data) + '\n');

    _config[which] = data[which];
  }
}


// check for potentially unsafe regular expressions:
// https://stackoverflow.com/a/43872595
function checkRegex(filepath, pattern) {
  if (!safeRegex(pattern)) {
    console.error(styleText('red', '\nError - Potentially unsafe regular expression:'));
    console.error('  ' + styleText('yellow', `${filepath}: ${pattern}`));
    process.exit(1);
  }
}

//
// Load the version number and the lists of tags collected from:
// https://github.com/ideditor/nsi-collector
//
async function loadCollected() {
  let currCollectionDate = 0;
  let seenCollectionDate = 0;

  // Check that we have installed the correct nsi-collector dependency.
  // If the user has an old version of nsi-collector, this can cause unwanted changes.
  // Exit if the dates don't match or it looks like the user needs to update - see #5519
  try {
    const collectorJSON = await Bun.file('./node_modules/@ideditor/nsi-collector/package.json').json();
    const rawVersion = collectorJSON.version;
    const matched = rawVersion.match(/^\d+\.\d+\.(\d+)$/);
    if (matched[1]) {
      currCollectionDate = +matched[1];
    } else {
      throw new Error(`Bad version: ${rawVersion}`);
    }
  } catch (err) {
    console.error(styleText('red', `Error reading 'nsi-collector/package.json': ${err.message} `));
    console.error(styleText('yellow', `Please run 'bun install' to fix.`));
    process.exit(1);
  }

  const dateFile = Bun.file('./config/collectionDate');
  try {
    if (await dateFile.exists()) {
      const yyyymmdd = await dateFile.text();
      seenCollectionDate = +yyyymmdd || 0;
    }
  } catch (err) {
    /* ignore - dateFile will be replaced */
  }

  if (currCollectionDate < seenCollectionDate) {
    console.error(styleText('red', `Outdated nsi-collector with date '${currCollectionDate}' < '${seenCollectionDate}'`));
    console.error(styleText('yellow', `Please run 'bun install' to fix.`));
    process.exit(1);

  } else if (currCollectionDate > seenCollectionDate) {
    console.log(styleText('yellow', `✨   New nsi-collector version ${currCollectionDate} (was ${seenCollectionDate}).`));
    await Bun.write(dateFile, currCollectionDate.toString());
  }


  // Load the collected data..
  for (const tag of ['name', 'brand', 'operator', 'network']) {
    const filepath = `./node_modules/@ideditor/nsi-collector/dist/osm/${tag}s_all.json`;
    let data;
    try {
      data = await Bun.file(filepath).json();
    } catch (jsonParseError) {
      console.error(styleText('red', `Error - ${jsonParseError.message} reading:`));
      console.error('  ' + styleText('yellow', filepath));
      process.exit(1);
    }

    _collected[tag] = data;
  }
}


//
// Filter the tags collected into _keep and _discard lists
//
async function filterCollected() {
  const START = '🏗   ' + styleText('yellow', `Filtering values collected from OSM…`);
  const END = '👍  ' + styleText('green', `done filtering`);
  console.log(START);
  console.time(END);

  // Before starting, cache genericWords regexes.
  const genericRegex = _config.genericWords.map(s => new RegExp(s, 'i'));
  genericRegex.push(new RegExp(/;/, 'i'));   // also discard values with semicolons


  for (const [t, tree] of Object.entries(_config.trees)) {
    if (!Array.isArray(tree.sourceTags) || !tree.sourceTags.length) continue;

    const discard = _discard[t] = {};
    const keep = _keep[t] = {};

    //
    // STEP 1:  All the collected "names" from OSM start out in `discard`
    //
    for (const tag of tree.sourceTags) {
      const collected = _collected[tag];
      for (const kvn in collected) {
        discard[kvn] = Math.max((discard[kvn] || 0), collected[kvn]);
      }
    }

    //
    // STEP 2:  Move "names" that aren't excluded from `discard` -> `keep`
    //
    const categoryRegex = {};  // regex cache
    for (const kvn in discard) {
      const [kv, n] = kvn.split('|', 2);  // kvn = "key/value|name"
      const tkv = `${t}/${kv}`;
      const file = `./data/${tkv}.json`;
      const category = _nsi.path[tkv];
      if (!category) continue;   // not a category we track in the index, skip

      const categoryProps = category.properties || {};
      if (categoryProps.skipCollection) continue;   // not a category where we want to collect new names, skip

      if (!categoryRegex[tkv]) {
        const exclude = categoryProps.exclude || {};
        const excludePatterns = (exclude.generic || []).concat((exclude.named || []));
        categoryRegex[tkv] = excludePatterns.map(s => checkRegex(file, s) || new RegExp(s, 'i'));
      }
      const isExcluded = categoryRegex[tkv].some(re => re.test(n)) || genericRegex.some(re => re.test(n));
      if (!isExcluded) {
        keep[kvn] = discard[kvn];
        delete discard[kvn];
      }
    }

    const discardCount = Object.keys(discard).length;
    const keepCount = Object.keys(keep).length;
    console.log(`${tree.emoji}  ${t}:\t${keepCount} keep, ${discardCount} discard`);

    await Bun.write(`./dist/json/filtered/${t}_discard.json`, stringify({ discard: sortObject(discard) }) + '\n');
    await Bun.write(`./dist/json/filtered/${t}_keep.json`, stringify({ keep: sortObject(keep) }) + '\n');
  }

  console.timeEnd(END);
}


//
// Load the index files under `./data/*`
//
async function loadIndex() {
  const START = '🏗   ' + styleText('yellow', `Loading index files…`);
  const END = '👍  ' + styleText('green', `done loading`);
  console.log(START);
  console.time(END);

  await fileTree.read(_nsi, _loco);
  fileTree.expandTemplates(_nsi, _loco);
  console.timeEnd(END);

  const MATCH_INDEX_END = '👍  ' + styleText('green', `built match index`);
  console.time(MATCH_INDEX_END);
  matcher.buildMatchIndex(_nsi.path);
  console.timeEnd(MATCH_INDEX_END);

  const warnMatched = matcher.getWarnings();
  if (warnMatched.length) {
    console.warn(styleText('yellow', '\n⚠️   Warning - matchIndex errors:'));
    console.warn(styleText('gray', ('-').repeat(70)));
    console.warn(styleText('gray', ('  `key/value/name` occurs multiple times in the match index.')));
    console.warn(styleText('gray', ('  To resolve these, make sure the key/value/name does not appear in multiple trees')));
    console.warn(styleText('gray', ('    (e.g. `amenity/post_office/ups` should not be both a "brand" and an "operator"')));
    console.warn(styleText('gray', ('-').repeat(70)));
    warnMatched.forEach(w => console.warn(styleText('yellow', w)));
    console.warn('total ' + warnMatched.length);
  }

//  // It takes a few seconds to resolve all of the locationSets into GeoJSON and insert into which-polygon
//  // We don't need a location index for this script, but it's useful to know.
//  const LOCATION_INDEX_END = '👍  ' + styleText('green', `built location index`);
//  console.time(LOCATION_INDEX_END);
//  matcher.buildLocationIndex(_nsi.path, _loco);
//  console.timeEnd(LOCATION_INDEX_END);
}


//
// Save the updated index files under `data/*`
//
async function saveIndex() {
  const START = '🏗   ' + styleText('yellow', `Saving index files…`);
  const END = '👍  ' + styleText('green', `done saving`);
  console.log(START);
  console.time(END);

  await fileTree.write(_nsi);
  console.timeEnd(END);
}


//
// mergeItems()
// Iterate over the names we are keeping and:
// - insert anything "new" (i.e. not matched by the matcher).
// - update all items to have whatever tags they should have.
//
function mergeItems() {
  // Any country codes which should be replaced by more standard ones in the locationSets
  const countryReplacements = {
    'uk': 'gb',  // Exceptionally reserved, United Kingdom is officially assigned the alpha-2 code GB
  };

  const START = '🏗   ' + styleText('yellow', `Merging items…`);
  const END = '👍  ' + styleText('green', `done merging`);
  console.log(START);
  console.time(END);


  Object.keys(_config.trees).forEach(t => {
    const tree = _config.trees[t];
    const newItems = {};
    let total = 0;
    let totalNew = 0;

    //
    // INSERT - Look in `_keep` for new items not yet in the index..
    //
    const keeping = _keep[t] || {};

    // Find new items, keeping only the most popular spelling..
    for (const kvn of Object.keys(keeping)) {
      const count = keeping[kvn];
      const [kv, n] = kvn.split('|', 2);     // kvn = "key/value|name"
      const [k, v] = kv.split('/', 2);

      const matched = matcher.match(k, v, n);
      if (matched) continue;     // already in the index (or generic)

      // Use the simplified name when comparing spelling popularity
      const nsimple = simplify(n);
      if (!nsimple) continue;  // invalid, or the name contains only punctuation?
      const newid = `${k}/${v}|${nsimple}`;
      const otherNew = newItems[newid];

      // Seen for the first time, or this name is a more popular spelling
      if (!otherNew || otherNew.count < count) {
        newItems[newid] = { kvn: kvn, count: count };
      }
    }

    // Add the new items
    for (const newItem of Object.values(newItems)) {
      const [kv, n] = newItem.kvn.split('|', 2);     // kvn = "key/value|name"
      const [k, v] = kv.split('/', 2);
      const tkv = `${t}/${k}/${v}`;

      const item = { tags: {} };
      item.displayName = n;
      item.locationSet = { include: ['001'] };   // the whole world
      item.tags[k] = v;     // assign default tag k=v

      // Perform tree-specific tag defaults here..
      if (t === 'brands') {
        item.tags.brand = n;
        item.tags.name = n;

      } else if (t === 'operators') {
        item.tags.operator = n;

      } else if (t === 'transit') {
        item.tags.network = n;
      }

      // Insert into index..
      if (!_nsi.path[tkv]) {
        _nsi.path[tkv] = { properties: { path: tkv }, items: [], templates: [] };
      }

      _nsi.path[tkv].items.push(item);
      totalNew++;
    }


    //
    // UPDATE - Check all items in the tree for expected tags..
    //
    const paths = Object.keys(_nsi.path).filter(tkv => tkv.split('/')[0] === t);
    paths.forEach(tkv => {
      const items = _nsi.path[tkv].items;
      if (!Array.isArray(items) || !items.length) return;

      const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
      const kv = `${k}/${v}`;

      items.forEach(item => {
        total++;
        const tags = item.tags;
        let name = '';   // which "name" we use for the locales check below

        // assign some default companion tags if missing
        if (kv === 'amenity/cafe') {
          if (!tags.takeaway)    tags.takeaway = 'yes';
          if (!tags.cuisine)     tags.cuisine = 'coffee_shop';
        } else if (kv === 'amenity/fast_food') {
          if (!tags.takeaway)    tags.takeaway = 'yes';
        } else if (kv === 'amenity/clinic') {
          if (!tags.healthcare)  tags.healthcare = 'clinic';
        } else if (kv === 'amenity/dentist') {
          if (!tags.healthcare)  tags.healthcare = 'dentist';
        } else if (kv === 'amenity/doctors') {
          if (!tags.healthcare)  tags.healthcare = 'doctor';
        } else if (kv === 'amenity/hospital') {
          if (!tags.healthcare)  tags.healthcare = 'hospital';
        } else if (kv === 'amenity/pharmacy') {
          if (!tags.healthcare)  tags.healthcare = 'pharmacy';
        }

        // Perform tree-specific tag cleanups here..
        if (t === 'brands') {
          name = tags.brand || tags.name;

        } else if (t === 'flags') {
          name = tags['flag:name'];

          // Sort the flags in the file according to their country of origin
          const country = tags.country || item.locationSet.include[0];
          if (typeof country === 'string' && country.length === 2) {
            const cc = country.toUpperCase();
            const re = new RegExp('^' + cc);   // leading country code
            if (!re.test(item.displayName)) {
              item.displayName = cc + ' - ' + item.displayName;
            }
          }

        } else if (t === 'operators') {
          name = tags.operator || tags.name || tags.brand;

          // Seed missing operator tags (for a file that we copied over from the 'brand' tree)
          Object.keys(tags).forEach(osmkey => {
            if (/brand/.test(osmkey)) {
              const brandkey = osmkey;
              const operatorkey = brandkey.replace('brand', 'operator');   // `brand`->`operator`, `brand:ru`->`operator:ru`, etc.
              if (!tags[operatorkey]) {
                tags[operatorkey] = tags[brandkey];
              }
            }
          });

        } else if (t === 'transit') {
          name = tags.network;
        }

        // If the name can only be reasonably read in one country,
        // assign `locationSet`, and localize tags like `name:xx`
        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
          // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
          if (!item.locationSet)  item.locationSet = { include: ['iw'] };
          setLanguageTags(tags, 'he');
        } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
          if (!item.locationSet)  item.locationSet = { include: ['th'] };
          setLanguageTags(tags, 'th');
        } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
          if (!item.locationSet)  item.locationSet = { include: ['mm'] };
          setLanguageTags(tags, 'my');
        } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
          if (!item.locationSet)  item.locationSet = { include: ['ph'] };
          setLanguageTags(tags, 'tl');
        } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
          if (!item.locationSet)  item.locationSet = { include: ['jp'] };
          setLanguageTags(tags, 'ja');
        } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
          if (!item.locationSet)  item.locationSet = { include: ['kr'] };
          setLanguageTags(tags, 'ko');
        } else {
          if (!item.locationSet)  item.locationSet = { include: ['001'] };   // the whole world
        }

        // Perform common tag cleanups here..
        Object.keys(tags).forEach(osmkey => {
          // Remove tags we're not including in this index
          // anything ending in `website` or `wikipedia` - #5275, #6481
          if (/(website|wikipedia)$/.test(osmkey)) {
            delete tags[osmkey];
            return;
          }
          // anything starting with `contact:` or `website:` - #9505
          if (/^(contact|website):/.test(osmkey)) {
            delete tags[osmkey];
            return;
          }

          // Perform Wikidata QID replacements
          // anything ending in `wikidata`
          if (/wikidata$/.test(osmkey)) {
            const wd = tags[osmkey];
            const replace = _config.replacements[wd];    // If it matches a QID in the replacement list...

            if (replace && replace.wikidata !== undefined) {   // replace or delete `*:wikidata` tag
              if (replace.wikidata) {
                tags[osmkey] = replace.wikidata;
              } else {
                delete tags[osmkey];
              }
            }
          }
        });

        // Perform locationSet country code replacements
        Object.keys(countryReplacements).forEach(country => {
          [item.locationSet.include, item.locationSet.exclude].forEach(v => {
            if (v) {
              normalizeCountryCode(v, country);
            }
          });
        });

        // regenerate id here, in case the locationSet has changed
        const locationID = _loco.validateLocationSet(item.locationSet).id;
        item.id = idgen(item, tkv, locationID);
      });
    });

    console.log(`${tree.emoji}  ${t}:\t${total} total, ${totalNew} new`);

  });

  console.timeEnd(END);


  // Copy main tag value to local tag value, but only if local value not assigned yet
  // re: 6788#issuecomment-1188024213
  function setLanguageTags(tags, code) {
    for (const k of ['name', 'brand', 'operator', 'network']) {
      const v = tags[k];
      const loc_k = `${k}:${code}`;   // e.g. `name:ja`
      const loc_v = tags[loc_k];
      if (v && !loc_v) {
        tags[loc_k] = v;
      }
    }
  }

  function normalizeCountryCode(countries, country) {
    const index = countries.indexOf(country.toLowerCase());
    if (index >= 0) {
      const replace = countryReplacements[country.toLowerCase()];
      if (replace && replace !== undefined) {
        countries[index] = replace.toLowerCase();
      }
    }
  }
}


//
// checkItems()
// Checks all the items for several kinds of issues
//
function checkItems(t) {
  const tree = _config.trees[t];
  const oddChars = /[\s=!"#%'*{},.\/:?\(\)\[\]@\\$\^*+<>«»~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u200b-\u200f\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\ufeff\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g;

  const warnDuplicate = [];
  const warnFormatWikidata = [];
  const warnMissingTag = [];
  const warnFormatTag = [];
//  const seenName = {};

  let total = 0;      // total items
  let totalWd = 0;    // total items with wikidata

  const paths = Object.keys(_nsi.path).filter(tkv => tkv.split('/')[0] === t);
  const display = (val) => `${val.displayName} (${val.id})`;

  paths.forEach(tkv => {
    const items = _nsi.path[tkv].items;
    if (!Array.isArray(items) || !items.length) return;

    const [_t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
    const kv = `${k}/${v}`;

    items.forEach(item => {
      const tags = item.tags;

      total++;
      if (tags[tree.mainTag]) totalWd++;

      // check tags
      Object.keys(tags).forEach(osmkey => {
        if (/:wikidata$/.test(osmkey)) {       // Check '*:wikidata' tags
          const wd = tags[osmkey];
          if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([display(item), wd]);
          }
        }
      });

      // Warn on other missing tags
      switch (kv) {
        case 'amenity/clinic':
        case 'amenity/hospital':
        case 'amenity/pharmacy':
          if (!tags.healthcare) { warnMissingTag.push([display(item), 'healthcare']); }
          break;
        case 'amenity/gambling':
        case 'leisure/adult_gaming_centre':
          if (!tags.gambling) { warnMissingTag.push([display(item), 'gambling']); }
          break;
        case 'amenity/fast_food':
        case 'amenity/restaurant':
          if (!tags.cuisine) { warnMissingTag.push([display(item), 'cuisine']); }
          break;
        case 'amenity/training':
          if (!tags.training) { warnMissingTag.push([display(item), 'training']); }
          break;
        case 'amenity/vending_machine':
          if (!tags.vending) { warnMissingTag.push([display(item), 'vending']); }
          break;
        case 'man_made/flagpole':
          if (!tags['flag:type']) { warnMissingTag.push([display(item), 'flag:type']); }
          if (!/^wiphala/.test(item.id)) {
            if (!tags.subject) { warnMissingTag.push([display(item), 'subject']); }
            if (!tags['subject:wikidata']) { warnMissingTag.push([display(item), 'subject:wikidata']); }
          }
          break;
        case 'shop/beauty':
          if (!tags.beauty) { warnMissingTag.push([display(item), 'beauty']); }
          break;
      }

      // Warn if OSM tags contain odd punctuation or spacing..
      ['beauty', 'cuisine', 'gambling', 'government', 'sport', 'training', 'vending'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val && oddChars.test(val)) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });
      // Warn if a semicolon-delimited multivalue has snuck into the index
      ['name', 'brand', 'operator', 'network'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val && /;/.test(val)) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });
      // Warn if user put `wikidata` instead of `brand:wikidata`
      ['wikidata'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });


// TODO ?
  //     // Warn about "new" (no wikidata) items that may duplicate an "existing" (has wikidata) item.
  //     // The criteria for this warning is:
  //     // - One of the items has no `brand:wikidata`
  //     // - The items have nearly the same name
  //     // - The items have the same locationSet (or the one without wikidata is worldwide)
  //     const name = tags.name || tags.brand;
  //     const stem = stemmer(name) || name;
  //     const itemwd = tags[tree.mainTag];
  //     const itemls = _loco.validateLocationSet(item.locationSet).id;

  //     if (!seenName[stem]) seenName[stem] = new Set();
  //     seenName[stem].add(item);

  //     if (seenName[stem].size > 1) {
  //       seenName[stem].forEach(other => {
  //         if (other.id === item.id) return;   // skip self
  //         const otherwd = other.tags[tree.mainTag];
  //         const otherls = _loco.validateLocationSet(other.locationSet).id;

  //         // pick one of the items without a wikidata tag to be the "duplicate"
  //         if (!itemwd && (itemls === otherls || itemls === '+[Q2]')) {
  //           warnDuplicate.push([display(item), display(other)]);
  //         } else if (!otherwd && (otherls === itemls || otherls === '+[Q2]')) {
  //           warnDuplicate.push([display(other), display(item)]);
  //         }
  //       });
  //     }

    });
  });

  if (warnMissingTag.length) {
    console.warn(styleText('yellow', '\n⚠️   Warning - Missing tag:'));
    console.warn(styleText('gray', ('-').repeat(70)));
    console.warn(styleText('gray', ('  To resolve these, add the missing tag.')));
    console.warn(styleText('gray', ('-').repeat(70)));
    warnMissingTag.forEach(w => console.warn(
      styleText('yellow', '  "' + w[0] + '"') + ' -> missing tag? -> ' + styleText('yellow', '"' + w[1] + '"')
    ));
    console.warn('total ' + warnMissingTag.length);
  }

  if (warnFormatTag.length) {
    console.warn(styleText('yellow', '\n⚠️   Warning - Unusual OpenStreetMap tag:'));
    console.warn(styleText('gray', ('-').repeat(70)));
    console.warn(styleText('gray', ('  To resolve these, make sure the OpenStreetMap tag is correct.')));
    console.warn(styleText('gray', ('-').repeat(70)));
    for (const w of warnFormatTag) {
      console.warn(styleText('yellow', `  "${w[0]}" -> unusual tag? -> "${w[1]}"`));
    }
    console.warn('total ' + warnFormatTag.length);
  }

  if (warnDuplicate.length) {
    console.warn(styleText('yellow', '\n⚠️   Warning - Potential duplicate:'));
    console.warn(styleText('gray', ('-').repeat(70)));
    console.warn(styleText('gray', ('  If the items are two different businesses,')));
    console.warn(styleText('gray', ('    make sure they both have accurate locationSets (e.g. "us"/"ca") and wikidata identifiers.')));
    console.warn(styleText('gray', ('  If the items are duplicates of the same business,')));
    console.warn(styleText('gray', ('    add `matchTags`/`matchNames` properties to the item that you want to keep, and delete the unwanted item.')));
    console.warn(styleText('gray', ('  If the duplicate item is a generic word,')));
    console.warn(styleText('gray', ('    add a filter to config/filter_brands.json and delete the unwanted item.')));
    console.warn(styleText('gray', ('-').repeat(70)));
    for (const w of warnDuplicate) {
      console.warn(styleText('yellow', `  "${w[0]}" -> duplicates? -> "${w[1]}"`));
    }
    console.warn('total ' + warnDuplicate.length);
  }

  if (warnFormatWikidata.length) {
    console.warn(styleText('yellow', '\n⚠️   Warning - Incorrect `wikidata` format:'));
    console.warn(styleText('gray', ('-').repeat(70)));
    console.warn(styleText('gray', ('  To resolve these, make sure "*:wikidata" tag looks like "Q191615".')));
    console.warn(styleText('gray', ('-').repeat(70)));
    for (const w of warnFormatWikidata) {
      console.warn(styleText('yellow', `  "${w[0]}" -> "*:wikidata": "${w[1]}"`));
    }
    console.warn('total ' + warnFormatWikidata.length);
  }

  const pctWd = total > 0 ? (totalWd * 100 / total).toFixed(1) : 0;

  console.log('');
  console.info(styleText(['blue', 'bold'], `${tree.emoji}  ${t}/* completeness:`));
  console.info(styleText(['blue', 'bold'], `    ${total} total`));
  console.info(styleText(['blue', 'bold'], `    ${totalWd} (${pctWd}%) with a '${tree.mainTag}' tag`));
}
