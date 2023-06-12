// External
import chalk from 'chalk';
import fs from 'node:fs';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import LocationConflation from '@rapideditor/location-conflation';
import safeRegex from 'safe-regex';
import stringify from '@aitodotai/json-stringify-pretty-compact';
const withLocale = localeCompare('en-US');

// Internal
import { fileTree } from '../lib/file_tree.js';
import { idgen } from '../lib/idgen.js';
import { Matcher } from '../lib/matcher.js';
import { simplify } from '../lib/simplify.js';
import { sortObject } from '../lib/sort_object.js';
import { stemmer } from '../lib/stemmer.js';
import { validate } from '../lib/validate.js';
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';
const matcher = new Matcher();

// JSON
import treesJSON from '../config/trees.json' assert {type: 'json'};
const trees = treesJSON.trees;

// We use LocationConflation for validating and processing the locationSets
import featureCollectionJSON from '../dist/featureCollection.json' assert {type: 'json'};
const loco = new LocationConflation(featureCollectionJSON);

console.log(chalk.blue('-'.repeat(70)));
console.log(chalk.blue('🗂   Build index'));
console.log(chalk.blue('-'.repeat(70)));

let _config = {};
loadConfig();

let _cache = {};
loadIndex();

checkItems('brands');
checkItems('flags');
checkItems('operators');
checkItems('transit');

let _currCollectionDate = 0;
let _collected = {};
let _discard = {};
let _keep = {};
loadCollected();
filterCollected();

mergeItems();

saveIndex();
console.log('');



//
// Load, validate, cleanup config files
//
function loadConfig() {
  ['trees', 'replacements', 'genericWords'].forEach(which => {
    const schema = JSON5.parse(fs.readFileSync(`./schema/${which}.json`, 'utf8'));
    const file = `config/${which}.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(chalk.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + chalk.yellow(file));
      process.exit(1);
    }

    // check JSON schema
    validate(file, data, schema);

    // check regexes
    if (which === 'trees') {
      Object.values(data.trees).forEach(tree => {
        checkRegex(file, tree.nameTags.primary);
        checkRegex(file, tree.nameTags.alternate);
      });

    } else if (which === 'genericWords') {
      Object.values(data.genericWords).forEach(pattern => checkRegex(file, pattern));
    }

    // Clean and sort the files for consistency, save them that way.
    if (which === 'trees') {
      Object.keys(data.trees).forEach(t => {
        let tree = data.trees[t];
        let cleaned = {
          emoji:      tree.emoji,
          mainTag:    tree.mainTag,
          sourceTag:  tree.sourceTag,
          nameTags: {
            primary:   tree.nameTags.primary,
            alternate: tree.nameTags.alternate,
          }
        };
        tree = cleaned;
      });
      data.trees = sortObject(data.trees);

    } else if (which === 'replacements') {
      Object.keys(data.replacements).forEach(qid => {
        let replacement = data.replacements[qid];
        let cleaned = {
          note:      replacement.note,
          wikidata:  replacement.wikidata
        };
        replacement = cleaned;
      });
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
    fs.writeFileSync(file, stringify(data) + '\n');

    _config[which] = data[which];
  });

}


// check for potentially unsafe regular expressions:
// https://stackoverflow.com/a/43872595
function checkRegex(fileName, pattern) {
  if (!safeRegex(pattern)) {
    console.error(chalk.red('\nError - Potentially unsafe regular expression:'));
    console.error('  ' + chalk.yellow(fileName + ': ' + pattern));
    process.exit(1);
  }
}

//
// Load the version number and the lists of tags collected from:
// https://github.com/ideditor/nsi-collector
//
function loadCollected() {
  try {
    const file = `./node_modules/@ideditor/nsi-collector/package.json`;
    const contents = fs.readFileSync(file, 'utf8');
    const collectorJSON = JSON5.parse(contents);
    const rawVersion = collectorJSON.version;
    const matched = rawVersion.match(/[~^]?\d+\.\d+\.(\d+)/);
    if (matched) {
      _currCollectionDate = +matched[1];
    }
  } catch (err) {
    console.error(chalk.yellow(`Warning - ${err.message} reading 'nsi-collector/package.json'`));
  }

  ['name', 'brand', 'operator', 'network'].forEach(tag => {
    const file = `./node_modules/@ideditor/nsi-collector/dist/osm/${tag}s_all.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(chalk.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + chalk.yellow(file));
      process.exit(1);
    }

    _collected[tag] = data;
  });
}


//
// Filter the tags collected into _keep and _discard lists
//
function filterCollected() {
  const START = '🏗   ' + chalk.yellow(`Filtering values collected from OSM...`);
  const END = '👍  ' + chalk.green(`done filtering`);
  console.log('');
  console.log(START);
  console.time(END);
  let shownSparkle = false;

  // Before starting, cache genericWords regexes.
  let genericRegex = _config.genericWords.map(s => new RegExp(s, 'i'));
  genericRegex.push(new RegExp(/;/, 'i'));   // also discard values with semicolons


  Object.keys(_config.trees).forEach(t => {
    const tree = _config.trees[t];
    if (!Array.isArray(tree.sourceTags) || !tree.sourceTags.length) return;

    let discard = _discard[t] = {};
    let keep = _keep[t] = {};
    let lastCollectionDate = -1;
    let contents, data;

    try {  // Load existing "keep" file
      contents = fs.readFileSync(`dist/filtered/${t}_keep.json`, 'utf8');
      data = JSON5.parse(contents);
      lastCollectionDate = +(data._meta.collectionDate) || -1;
      keep = _keep[t] = data.keep;
    } catch (err) {
      /* ignore - we can overwrite the keep file */
    }

    // Exit here if:
    // 1. we have data in `keep`, and..
    // 2. that data is fresh (newer or same as installed nsi-collector dependency) - #5519
    // (comment out this next line to force replace the keep/discard lists)
    if (Object.keys(keep).length && lastCollectionDate >= _currCollectionDate) return;

    // Continue, do filtering, and replace keep/discard lists..
    if (!shownSparkle) {
      console.log(chalk.yellow(`✨   New nsi-collector version ${_currCollectionDate} (was ${lastCollectionDate}).  Updating filter lists:`));
      shownSparkle = true;
    }

    //
    // STEP 1:  All the collected "names" from OSM start out in `discard`
    //
    keep = {};
    tree.sourceTags.forEach(tag => {
      let collected = _collected[tag];
      for (const kvn in collected) {
        discard[kvn] = Math.max((discard[kvn] || 0), collected[kvn]);
      }
    });

    //
    // STEP 2:  Move "names" that aren't excluded from `discard` -> `keep`
    //
    let categoryRegex = {};  // regex cache
    for (const kvn in discard) {
      const [kv, n] = kvn.split('|', 2);  // kvn = "key/value|name"
      const tkv = `${t}/${kv}`;
      const file = `./data/${tkv}.json`;
      const category = _cache.path[tkv];
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

    let stringified;
    const meta = { collectionDate: _currCollectionDate.toString(10) };

    stringified = stringify({ discard: sortObject(discard) }) + '\n';
    writeFileWithMeta(`dist/filtered/${t}_discard.json`, stringified, meta);

    stringified = stringify({ keep: sortObject(keep) }) + '\n';
    writeFileWithMeta(`dist/filtered/${t}_keep.json`, stringified, meta);
  });

  console.timeEnd(END);
}


//
// Load the index files under `data/*`
//
function loadIndex() {
  const START = '🏗   ' + chalk.yellow(`Loading index files...`);
  const END = '👍  ' + chalk.green(`done loading`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.read(_cache, loco);
  fileTree.expandTemplates(_cache, loco);
  console.timeEnd(END);

  const MATCH_INDEX_END = '👍  ' + chalk.green(`built match index`);
  console.time(MATCH_INDEX_END);
  matcher.buildMatchIndex(_cache.path);
  console.timeEnd(MATCH_INDEX_END);

  let warnMatched = matcher.getWarnings();
  if (warnMatched.length) {
    console.warn(chalk.yellow('\n⚠️   Warning - matchIndex errors:'));
    console.warn(chalk.gray('-').repeat(70));
    console.warn(chalk.gray('  `key/value/name` occurs multiple times in the match index.'));
    console.warn(chalk.gray('  To resolve these, make sure the key/value/name does not appear in multiple trees'));
    console.warn(chalk.gray('    (e.g. `amenity/post_office/ups` should not be both a "brand" and an "operator"'));
    console.warn(chalk.gray('-').repeat(70));
    warnMatched.forEach(w => console.warn(chalk.yellow(w)));
    console.warn('total ' + warnMatched.length);
  }



  // It takes a few seconds to resolve all of the locationSets into GeoJSON and insert into which-polygon
  // We don't need a location index for this script, but it's useful to know.
  const LOCATION_INDEX_END = '👍  ' + chalk.green(`built location index`);
  console.time(LOCATION_INDEX_END);
  matcher.buildLocationIndex(_cache.path, loco);
  console.timeEnd(LOCATION_INDEX_END);
}


//
// Save the updated index files under `data/*`
//
function saveIndex() {
  const START = '🏗   ' + chalk.yellow(`Saving index files...`);
  const END = '👍  ' + chalk.green(`done saving`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.write(_cache);
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
  }

  const START = '🏗   ' + chalk.yellow(`Merging items...`);
  const END = '👍  ' + chalk.green(`done merging`);
  console.log('');
  console.log(START);
  console.time(END);


  Object.keys(_config.trees).forEach(t => {
    const tree = _config.trees[t];
    let total = 0;
    let totalNew = 0;
    let newItems = {};

    //
    // INSERT - Look in `_keep` for new items not yet in the index..
    //
    const keeping = _keep[t] || {};

    // Find new items, keeping only the most popular spelling..
    Object.keys(keeping).forEach(kvn => {
      const count = keeping[kvn];
      const [kv, n] = kvn.split('|', 2);     // kvn = "key/value|name"
      const [k, v] = kv.split('/', 2);

      const matched = matcher.match(k, v, n);
      if (matched) return;     // already in the index (or generic)

      // Use the simplified name when comparing spelling popularity
      const nsimple = simplify(n);
      if (!nsimple) return;  // invalid, or the name contains only punctuation?
      const newid = `${k}/${v}|${nsimple}`;
      const otherNew = newItems[newid];

      // Seen for the first time, or this name is a more popular spelling
      if (!otherNew || otherNew.count < count) {
        newItems[newid] = { kvn: kvn, count: count };
      }
    });

    // Add the new items
    Object.values(newItems).forEach(newItem => {
      const [kv, n] = newItem.kvn.split('|', 2);     // kvn = "key/value|name"
      const [k, v] = kv.split('/', 2);
      const tkv = `${t}/${k}/${v}`;

      let item = { tags: {} };
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
      if (!_cache.path[tkv]) {
        _cache.path[tkv] = { properties: { path: tkv }, items: [], templates: [] };
      }

      _cache.path[tkv].items.push(item);
      totalNew++;
    });


    //
    // UPDATE - Check all items in the tree for expected tags..
    //
    const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === t);
    paths.forEach(tkv => {
      let items = _cache.path[tkv].items;
      if (!Array.isArray(items) || !items.length) return;

      const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
      const kv = `${k}/${v}`;

      items.forEach(item => {
        total++;
        let tags = item.tags;
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
          let country = tags.country || item.locationSet.include[0];
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
        const locationID = loco.validateLocationSet(item.locationSet).id;
        item.id = idgen(item, tkv, locationID);
      });
    });

    console.log(`${tree.emoji}  ${t}:\t${total} total, ${totalNew} new`);

  });

  console.timeEnd(END);


  // Copy main tag value to local tag value, but only if local value not assigned yet
  // re: 6788#issuecomment-1188024213
  function setLanguageTags(tags, code) {
    ['name', 'brand', 'operator', 'network'].forEach(k => {
      const v = tags[k];
      const loc_k = `${k}:${code}`;   // e.g. `name:ja`
      const loc_v = tags[loc_k];
      if (v && !loc_v) {
        tags[loc_k] = v;
      }
    });
  }

  function normalizeCountryCode(countries, country) {
    const index = countries.indexOf(country.toLowerCase())
    if (index >= 0) {
      const replace = countryReplacements[country.toLowerCase()];
      if (replace && replace !== undefined) {
        countries[index] = replace.toLowerCase()
      }
    }
  }
}


//
// checkItems()
// Checks all the items for several kinds of issues
//
function checkItems(t) {
  console.log('');
  console.log('🏗   ' + chalk.yellow(`Checking ${t}...`));

  const tree = _config.trees[t];
  const oddChars = /[\s=!"#%'*{},.\/:?\(\)\[\]@\\$\^*+<>«»~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u200b-\u200f\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\ufeff\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g;

  let warnDuplicate = [];
  let warnFormatWikidata = [];
  let warnMissingTag = [];
  let warnFormatTag = [];
  let seenName = {};

  let total = 0;      // total items
  let totalWd = 0;    // total items with wikidata

  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === t);
  const display = (val) => `${val.displayName} (${val.id})`;

  paths.forEach(tkv => {
    const items = _cache.path[tkv].items;
    if (!Array.isArray(items) || !items.length) return;

    const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
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
            if (!tags['subject']) { warnMissingTag.push([display(item), 'subject']); }
            if (!tags['subject:wikidata']) { warnMissingTag.push([display(item), 'subject:wikidata']); }
          }
          break;
        case 'shop/beauty':
          if (!tags.beauty) { warnMissingTag.push([display(item), 'beauty']); }
          break;
      }

      // Warn if OSM tags contain odd punctuation or spacing..
      ['beauty', 'cuisine', 'flush:disposal', 'gambling', 'government', 'sport', 'training', 'vending'].forEach(osmkey => {
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
  //     const itemls = loco.validateLocationSet(item.locationSet).id;

  //     if (!seenName[stem]) seenName[stem] = new Set();
  //     seenName[stem].add(item);

  //     if (seenName[stem].size > 1) {
  //       seenName[stem].forEach(other => {
  //         if (other.id === item.id) return;   // skip self
  //         const otherwd = other.tags[tree.mainTag];
  //         const otherls = loco.validateLocationSet(other.locationSet).id;

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
    console.warn(chalk.yellow('\n⚠️   Warning - Missing tag:'));
    console.warn(chalk.gray('-').repeat(70));
    console.warn(chalk.gray('  To resolve these, add the missing tag.'));
    console.warn(chalk.gray('-').repeat(70));
    warnMissingTag.forEach(w => console.warn(
      chalk.yellow('  "' + w[0] + '"') + ' -> missing tag? -> ' + chalk.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnMissingTag.length);
  }

  if (warnFormatTag.length) {
    console.warn(chalk.yellow('\n⚠️   Warning - Unusual OpenStreetMap tag:'));
    console.warn(chalk.gray('-').repeat(70));
    console.warn(chalk.gray('  To resolve these, make sure the OpenStreetMap tag is correct.'));
    console.warn(chalk.gray('-').repeat(70));
    warnFormatTag.forEach(w => console.warn(
      chalk.yellow('  "' + w[0] + '"') + ' -> unusual tag? -> ' + chalk.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnFormatTag.length);
  }

  if (warnDuplicate.length) {
    console.warn(chalk.yellow('\n⚠️   Warning - Potential duplicate:'));
    console.warn(chalk.gray('-').repeat(70));
    console.warn(chalk.gray('  If the items are two different businesses,'));
    console.warn(chalk.gray('    make sure they both have accurate locationSets (e.g. "us"/"ca") and wikidata identifiers.'));
    console.warn(chalk.gray('  If the items are duplicates of the same business,'));
    console.warn(chalk.gray('    add `matchTags`/`matchNames` properties to the item that you want to keep, and delete the unwanted item.'));
    console.warn(chalk.gray('  If the duplicate item is a generic word,'));
    console.warn(chalk.gray('    add a filter to config/filter_brands.json and delete the unwanted item.'));
    console.warn(chalk.gray('-').repeat(70));
    warnDuplicate.forEach(w => console.warn(
      chalk.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + chalk.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnDuplicate.length);
  }

  if (warnFormatWikidata.length) {
    console.warn(chalk.yellow('\n⚠️   Warning - Incorrect `wikidata` format:'));
    console.warn(chalk.gray('-').repeat(70));
    console.warn(chalk.gray('  To resolve these, make sure "*:wikidata" tag looks like "Q191615".'));
    console.warn(chalk.gray('-').repeat(70));
    warnFormatWikidata.forEach(w => console.warn(
      chalk.yellow('  "' + w[0] + '"') + ' -> "*:wikidata": ' + '"' + w[1] + '"'
    ));
    console.warn('total ' + warnFormatWikidata.length);
  }

  const pctWd = total > 0 ? (totalWd * 100 / total).toFixed(1) : 0;

  console.log('');
  console.info(chalk.blue.bold(`${tree.emoji}  ${t}/* completeness:`));
  console.info(chalk.blue.bold(`    ${total} total`));
  console.info(chalk.blue.bold(`    ${totalWd} (${pctWd}%) with a '${tree.mainTag}' tag`));
}
