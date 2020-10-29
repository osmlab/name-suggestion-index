const colors = require('colors/safe');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const fileTree = require('../lib/file_tree.js');
const idgen = require('../lib/idgen.js');
const matcher = require('../lib/matcher.js')();
const sort = require('../lib/sort.js');
const stemmer = require('../lib/stemmer.js');
const validate = require('../lib/validate.js');

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

console.log(colors.blue('-'.repeat(70)));
console.log(colors.blue('🍔  Build brands/*'));
console.log(colors.blue('-'.repeat(70)));

// Load and check filter_brands.json
let filters = require('../config/filter_brands.json');
const filtersSchema = require('../schema/filters.json');
validate('config/filter_brands.json', filters, filtersSchema);  // validate JSON-schema

// Lowercase and sort the filters for consistency
filters = {
  keepTags: filters.keepTags.map(s => s.toLowerCase()).sort(),
  discardKeys: filters.discardKeys.map(s => s.toLowerCase()).sort(),
  discardNames: filters.discardNames.map(s => s.toLowerCase()).sort()
};
fs.writeFileSync('config/filter_brands.json', stringify(filters));


// we'll use both brand and name tags
const allnames = require('../dist/collected/names_all.json');
const allbrands = require('../dist/collected/brands_all.json');

let _discard = {};
let _keep = {};
// all names and brands start out in _discard..
Object.keys(allnames).forEach(kvn => _discard[kvn] = _discard[kvn] || allnames[kvn]);
Object.keys(allbrands).forEach(kvn => _discard[kvn] = _discard[kvn] || allbrands[kvn]);
filterNames();


let _cache = { path: {}, id: {} };

// Load and check brand files
fileTree.read('brands', _cache, loco);

buildMatchIndexes();
checkItems();
mergeItems();

fileTree.write('brands', _cache);
console.log('');



// `filterNames()` will process a `names_all.json` file,
// splitting the data up into 2 files:
//
// `dist/filtered/names_keep.json` - candidates for suggestion presets
// `dist/filtered/names_discard.json` - everything else
//
// The file format is identical to the `names_all.json` file:
// "key/value|name": count
// "shop/coffee|Starbucks": 8284
//
function filterNames() {
  const START = '🏗   ' + colors.yellow('Filtering names gathered from OSM...');
  const END = '👍  ' + colors.green('names filtered');
  console.log('');
  console.log(START);
  console.time(END);

  // Start clean
  shell.rm('-f', ['dist/filtered/names_keep.json', 'dist/filtered/names_discard.json']);

  // filter by keepTags (move from _discard -> _keep)
  filters.keepTags.forEach(s => {
    const re = new RegExp(s, 'i');
    for (let kvn in _discard) {
      const tag = kvn.split('|', 2)[0];
      if (re.test(tag)) {
        _keep[kvn] = _discard[kvn];
        delete _discard[kvn];
      }
    }
  });

  // filter by discardKeys (move from _keep -> _discard)
  filters.discardKeys.forEach(s => {
    const re = new RegExp(s, 'i');
    for (let kvn in _keep) {
      if (re.test(kvn)) {
        _discard[kvn] = _keep[kvn];
        delete _keep[kvn];
      }
    }
  });

  // filter by discardNames (move from _keep -> _discard)
  filters.discardNames.forEach(s => {
    const re = new RegExp(s, 'i');
    for (let kvn in _keep) {
      const name = kvn.split('|', 2)[1];
      if (re.test(name)) {
        _discard[kvn] = _keep[kvn];
        delete _keep[kvn];
      }
    }
  });

  // discard semicolon-delimited multivalues
  for (let kvn in _keep) {
    const name = kvn.split('|', 2)[1];
    if (/;/.test(name)) {
      _discard[kvn] = _keep[kvn];
      delete _keep[kvn];
    }
  }

  const discardCount = Object.keys(_discard).length;
  const keepCount = Object.keys(_keep).length;
  console.log(`📦  Discard: ${discardCount}`);
  console.log(`📦  Keep: ${keepCount}`);

  fs.writeFileSync('dist/filtered/names_discard.json', stringify(sort(_discard)));
  fs.writeFileSync('dist/filtered/names_keep.json', stringify(sort(_keep)));

  console.timeEnd(END);
}


//
// buildMatchIndexes()
// Sets up the `matcher` so we can use it to do k/v/n matching.
// We can skip the location indexing for this script.
//
function buildMatchIndexes() {
  const START = '🏗   ' + colors.yellow('Building match indexes...');
  const END = '👍  ' + colors.green('indexes built');
  console.log('');
  console.log(START);
  console.time(END);

  matcher.buildMatchIndex(_cache.path, loco);

  // It takes about 7 seconds to resolve all of the locationSets into GeoJSON and insert into which-polygon
  // We don't need the location index for this script, but it's useful to know.
  //  matcher.buildLocationIndex(_cache.path, loco);

  console.timeEnd(END);
}


//
// mergeItems()
// Iterate over the names we are keeping and:
// - insert anything "new" (i.e. not matched by the matcher).
// - update all items to have whatever tags they should have.
//
function mergeItems() {
  const t = 'brands';

  const START = '⚙️   ' + colors.yellow(`Merging ${t}...`);
  const END = '👍  ' + colors.green(`${t} merged`);
  console.log('');
  console.log(START);
  console.time(END);

  let newCount = 0;

  // First, INSERT - Look in `_keep` for new items not yet in the index
  Object.keys(_keep).forEach(kvn => {
    const parts = kvn.split('|', 2);     // kvn = "key/value|name"
    const kv = parts[0];
    const n = parts[1];
    const parts2 = kv.split('/', 2);
    const k = parts2[0];
    const v = parts2[1];
    const tkv = `${t}/${k}/${v}`;

    const m = matcher.match(k, v, n);
    if (m) return;  // already in the index

    // a new item!
    let item = {
      displayName: n,
      tags: {
        brand: n,
        name:  n
      }
    };

    // assign default osm tag
    item.tags[k] = v;

    // INSERT
    if (!_cache.path[tkv])  _cache.path[tkv] = [];
    _cache.path[tkv].push(item);
    newCount++;
  });


  // Next, UPDATE - Check all items for expected tags
  // for now, process `brands/*` only
  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === 'brands');

  paths.forEach(tkv => {
    let items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const k = parts[1];
    const v = parts[2];

    items.forEach(item => {
      let tags = item.tags;
      const name = tags.name || tags.brand;

      // Assign default tags
      if (k === 'amenity' && v === 'cafe') {
        if (!tags.takeaway)    tags.takeaway = 'yes';
        if (!tags.cuisine)     tags.cuisine = 'coffee_shop';
      } else if (k === 'amenity' && v === 'fast_food') {
        if (!tags.takeaway)    tags.takeaway = 'yes';
      } else if (k === 'amenity' && v === 'pharmacy') {
        if (!tags.healthcare)  tags.healthcare = 'pharmacy';
      }

      // If the name can only be reasonably read in one country.
      // Assign `locationSet`, and duplicate `name:xx` and `brand:xx` tags
      // https://www.regular-expressions.info/unicode.html
      if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
        // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
        if (!item.locationSet)  item.locationSet = { include: ['il'] };
        if (tags.name)          tags['name:he']  = tags.name;
        if (tags.brand)         tags['brand:he'] = tags.brand;
      } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
        if (!item.locationSet)  item.locationSet = { include: ['th'] };
        if (tags.name)          tags['name:th']  = tags.name;
        if (tags.brand)         tags['brand:th'] = tags.brand;
      } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
        if (!item.locationSet)  item.locationSet = { include: ['mm'] };
        if (tags.name)          tags['name:my']  = tags.name;
        if (tags.brand)         tags['brand:my'] = tags.brand;
      } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
        if (!item.locationSet)  item.locationSet = { include: ['kr'] };
        if (tags.name)          tags['name:ko']  = tags.name;
        if (tags.brand)         tags['brand:ko'] = tags.brand;
      } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
        if (!item.locationSet)  item.locationSet = { include: ['ph'] };
        if (tags.name)          tags['name:tl']  = tags.name;
        if (tags.brand)         tags['brand:tl'] = tags.brand;
      } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
        if (!item.locationSet)  item.locationSet = { include: ['jp'] };
        if (tags.name)          tags['name:ja']  = tags.name;
        if (tags.brand)         tags['brand:ja'] = tags.brand;
      } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
        if (!item.locationSet)  item.locationSet = { include: ['kr'] };
        if (tags.name)          tags['name:ko']  = tags.name;
        if (tags.brand)         tags['brand:ko'] = tags.brand;
      } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
        if (!item.locationSet)  item.locationSet = { include: ['kr'] };
        if (tags.name)          tags['name:ko']  = tags.name;
        if (tags.brand)         tags['brand:ko'] = tags.brand;
      } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
        if (!item.locationSet)  item.locationSet = { include: ['kr'] };
        if (tags.name)          tags['name:ko']  = tags.name;
        if (tags.brand)         tags['brand:ko'] = tags.brand;
      } else {
        if (!item.locationSet)  item.locationSet = { include: ['001'] };   // the whole world
      }

      // regenerate id here, in case the locationSet has changed
      const locationID = loco.validateLocationSet(item.locationSet).id;
      item.id = idgen(item, tkv, locationID);
    });
  });

  console.log(`📦  New: ${newCount}`);
  console.timeEnd(END);
}


//
// checkItems()
// Checks all the items for several kinds of issues
//
function checkItems() {
  const t = 'brands';
  console.log('');
  console.log('⚙️   ' + colors.yellow(`Checking ${t}...`));

  const oddPunctuation = /[\s\=!"#%'*{},.\/:?\(\)\[\]@\\$\^*+<>~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g;

  let warnMatched = matcher.getWarnings();
  let warnDuplicate = [];
  let warnFormatWikidata = [];
  let warnFormatWikipedia = [];
  let warnMissingTag = [];
  let warnFormatTag = [];
  let seenName = {};

  let total = 0;
  let totalWd = 0;

  // for now, process `brands/*` only
  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === 'brands');
  const display = (val) => `${val.displayName} (${val.id})`;

  paths.forEach(tkv => {
    const items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const k = parts[1];
    const v = parts[2];
    const kv = `${k}/${v}`;

    items.forEach(item => {
      const tags = item.tags;
      const name = tags.name || tags.brand;

      total++;
      if (tags['brand:wikidata']) totalWd++;

      // check tags
      Object.keys(tags).forEach(osmkey => {
        if (/:wikidata$/.test(osmkey)) {       // Check '*:wikidata' tags
          const wd = tags[osmkey];
          if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([display(item), wd]);
          }
        }
        if (/:wikipedia$/.test(osmkey)) {      // Check '*.wikipedia' tags
          // So many contributors get the wikipedia tags wrong, so let's just reformat it for them.
          const wp = tags[osmkey] = decodeURIComponent(tags[osmkey]).replace('_', ' ');
          if (!/^[a-z\-]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([display(item), wp]);
          }
        }
      });

      // Warn on other missing tags
      switch (kv) {
        case 'amenity/gambling':
        case 'leisure/adult_gaming_centre':
          if (!tags.gambling) { warnMissingTag.push([display(item), 'gambling']); }
          break;
        case 'amenity/fast_food':
        case 'amenity/restaurant':
          if (!tags.cuisine) { warnMissingTag.push([display(item), 'cuisine']); }
          break;
        case 'amenity/vending_machine':
          if (!tags.vending) { warnMissingTag.push([display(item), 'vending']); }
          break;
        case 'shop/beauty':
          if (!tags.beauty) { warnMissingTag.push([display(item), 'beauty']); }
          break;
      }

      // Warn if OSM tags contain odd punctuation or spacing..
      ['cuisine', 'vending', 'beauty', 'gambling'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val && oddPunctuation.test(val)) {
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
      // Warn if user put `wikidata`/`wikipedia` instead of `brand:wikidata`/`brand:wikipedia`
      ['wikipedia', 'wikidata'].forEach(osmkey => {
        const val = tags[osmkey];
        if (val) {
          warnFormatTag.push([display(item), `${osmkey} = ${val}`]);
        }
      });


      // Warn about "new" (no wikidata) items that may duplicate an "existing" (has wikidata) item.
      // The criteria for this warning is:
      // - One of the items has no `brand:wikidata`
      // - The items have nearly the same name
      // - The items have the same locationSet (or the one without wikidata is worldwide)
      const stem = stemmer(name) || name;
      const itemwd = tags['brand:wikidata'];
      const itemls = loco.validateLocationSet(item.locationSet).id;

      if (!seenName[stem]) seenName[stem] = new Set();
      seenName[stem].add(item);

      if (seenName[stem].size > 1) {
        seenName[stem].forEach(other => {
          if (other.id === item.id) return;   // skip self
          const otherwd = other.tags['brand:wikidata'];
          const otherls = loco.validateLocationSet(other.locationSet).id;

          // pick one of the items without a wikidata tag to be the "duplicate"
          if (!itemwd && (itemls === otherls || itemls === '+[Q2]')) {
            warnDuplicate.push([display(item), display(other)]);
          } else if (!otherwd && (otherls === itemls || otherls === '+[Q2]')) {
            warnDuplicate.push([display(other), display(item)]);
          }
        });
      }

    });
  });

  if (warnMatched.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Ambiguous matches:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  If the items are the different, make sure they have different locationSets (e.g. "us", "ca"'));
    console.warn(colors.gray('  If the items are the same, remove extra `matchTags` or `matchNames`.  Remember:'));
    console.warn(colors.gray('  - Name matching ignores letter case, punctuation, spacing, and diacritical marks (é vs e). '));
    console.warn(colors.gray('    No need to add `matchNames` for variations in these.'));
    console.warn(colors.gray('  - Tag matching automatically includes other similar tags in the same match group.'));
    console.warn(colors.gray('    No need to add `matchTags` for similar tags.  see `config/match_groups.json`'));
    console.warn(colors.gray('-').repeat(70));
    warnMatched.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnMatched.length);
  }

  if (warnMissingTag.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Missing tag:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, add the missing tag.'));
    console.warn(colors.gray('-').repeat(70));
    warnMissingTag.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> missing tag? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnMissingTag.length);
  }

  if (warnFormatTag.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Unusual OpenStreetMap tag:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure the OpenStreetMap tag is correct.'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatTag.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> unusual tag? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnFormatTag.length);
  }

  if (warnDuplicate.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Potential duplicate:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  If the items are two different businesses,'));
    console.warn(colors.gray('    make sure they both have accurate locationSets (e.g. "us"/"ca") and wikidata identifiers.'));
    console.warn(colors.gray('  If the items are duplicates of the same business,'));
    console.warn(colors.gray('    add `matchTags`/`matchNames` properties to the item that you want to keep, and delete the unwanted item.'));
    console.warn(colors.gray('  If the duplicate item is a generic word,'));
    console.warn(colors.gray('    add a filter to config/filter_brands.json and delete the unwanted item.'));
    console.warn(colors.gray('-').repeat(70));
    warnDuplicate.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + colors.yellow('"' + w[1] + '"')
    ));
    console.warn('total ' + warnDuplicate.length);
  }

  if (warnFormatWikidata.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Incorrect `wikidata` format:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure "*:wikidata" tag looks like "Q191615".'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatWikidata.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> "*:wikidata": ' + '"' + w[1] + '"'
    ));
    console.warn('total ' + warnFormatWikidata.length);
  }

  if (warnFormatWikipedia.length) {
    console.warn(colors.yellow('\n⚠️   Warning - Incorrect `wikipedia` format:'));
    console.warn(colors.gray('-').repeat(70));
    console.warn(colors.gray('  To resolve these, make sure "*:wikipedia" tag looks like "en:Pizza Hut".'));
    console.warn(colors.gray('-').repeat(70));
    warnFormatWikipedia.forEach(w => console.warn(
      colors.yellow('  "' + w[0] + '"') + ' -> "*:wikipedia": ' + '"' + w[1] + '"'
    ));
    console.warn('total ' + warnFormatWikipedia.length);
  }

  const hasWd = total - totalWd;
  const pctWd = (hasWd * 100 / total).toFixed(1);

  console.info(colors.blue.bold(`\n${t}/* completeness:`));
  console.info(colors.blue.bold(`  ${total} items total.`));
  console.info(colors.blue.bold(`  ${hasWd} (${pctWd}%) with a '*:wikidata' tag.`));
}
