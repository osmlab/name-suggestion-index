const colors = require('colors/safe');
const fs = require('fs');
const JSON5 = require('json5');
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
console.log(colors.blue('🗂   Build index'));
console.log(colors.blue('-'.repeat(70)));

let _collected = {};
loadCollected();

let _filters = {};
loadFilters();

let _discard = {};
let _keep = {};
runFilters();

let _cache = { path: {}, id: {} };
loadIndex();

checkItems('brands');
checkItems('operators');
checkItems('transit');

mergeItems();

saveIndex();
console.log('');


//
// Load, validate, and cleanup filter files
//
function loadFilters() {
  const filtersSchema = require('../schema/filters.json');

  ['brands', 'operators', 'transit'].forEach(tree => {
    const file = `config/filter_${tree}.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    // check JSON schema
    validate(file, data, filtersSchema);

    // Lowercase and sort the files for consistency, save them that way.
    data = {
      keepTags: data.keepTags.map(s => s.toLowerCase()).sort(),
      discardKeys: data.discardKeys.map(s => s.toLowerCase()).sort(),
      discardNames: data.discardNames.map(s => s.toLowerCase()).sort()
    };
    fs.writeFileSync(file, stringify(data));

    _filters[tree] = data;
  });
}


//
// Load lists of tags collected from OSM from `dist/collected/*`
//
function loadCollected() {
  ['name', 'brand', 'operator', 'network'].forEach(tag => {
    const file = `dist/collected/${tag}s_all.json`;
    const contents = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    _collected[tag] = data;
  });
}


//
// Filter the tags collected into _keep and _discard lists
//
function runFilters() {
  const START = '🏗   ' + colors.yellow(`Filtering values gathered from OSM...`);
  const END = '👍  ' + colors.green(`done filtering`);
  console.log('');
  console.log(START);
  console.time(END);

  // which trees use which tags?
  const treeTags = {
    brands:     ['brand', 'name'],
    operators:  ['operator'],
    transit:    ['network']
  };

  ['brands', 'operators', 'transit'].forEach(tree => {
    let filters = _filters[tree];
    let discard = _discard[tree] = {};
    let keep = _keep[tree] = {};

    // Start clean
    shell.rm('-f', [`dist/filtered/${tree}_keep.json`, `dist/filtered/${tree}_discard.json`]);

    // All the collected values start out in discard..
    treeTags[tree].forEach(tag => {
      let collected = _collected[tag];
      for (const kvn in collected) {
        discard[kvn] = Math.max((discard[kvn] || 0), collected[kvn]);
      }
    });

    // Filter by keepTags (move from discard -> keep)
    filters.keepTags.forEach(s => {
      const re = new RegExp(s, 'i');
      for (const kvn in discard) {
        const tag = kvn.split('|', 2)[0];
        if (re.test(tag)) {
          keep[kvn] = discard[kvn];
          delete discard[kvn];
        }
      }
    });

    // Filter by discardKeys (move from keep -> discard)
    filters.discardKeys.forEach(s => {
      const re = new RegExp(s, 'i');
      for (const kvn in keep) {
        if (re.test(kvn)) {
          discard[kvn] = keep[kvn];
          delete keep[kvn];
        }
      }
    });

    // filter by discardNames (move from keep -> discard)
    filters.discardNames.forEach(s => {
      const re = new RegExp(s, 'i');
      for (let kvn in keep) {
        const name = kvn.split('|', 2)[1];
        if (re.test(name) || /;/.test(name)) {  // also discard values with semicolons
          discard[kvn] = keep[kvn];
          delete keep[kvn];
        }
      }
    });

    const discardCount = Object.keys(discard).length;
    const keepCount = Object.keys(keep).length;
    console.log(`📦  ${tree}:\t${keepCount} keep, ${discardCount} discard`);

    fs.writeFileSync(`dist/filtered/${tree}_discard.json`, stringify(sort(discard)));
    fs.writeFileSync(`dist/filtered/${tree}_keep.json`, stringify(sort(keep)));

  });

  console.timeEnd(END);
}


//
// Load the index files under `data/*`
//
function loadIndex() {
  const START = '🏗   ' + colors.yellow(`Loading index files...`);
  const END = '👍  ' + colors.green(`done loading`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.read('brands', _cache, loco);
  fileTree.read('operators', _cache, loco);
  fileTree.read('transit', _cache, loco);

  matcher.buildMatchIndex(_cache.path, loco);
  // It takes a while to resolve all of the locationSets into GeoJSON and insert into which-polygon
  // We don't need a location index for this script, but it's useful to know.
  //  matcher.buildLocationIndex(_cache.path, loco);

  console.timeEnd(END);
}


//
// Save the updated index files under `data/*`
//
function saveIndex() {
  const START = '🏗   ' + colors.yellow(`Saving index files...`);
  const END = '👍  ' + colors.green(`done saving`);
  console.log('');
  console.log(START);
  console.time(END);

  fileTree.write('brands', _cache);
  fileTree.write('operators', _cache);
  fileTree.write('transit', _cache);

  console.timeEnd(END);
}


//
// mergeItems()
// Iterate over the names we are keeping and:
// - insert anything "new" (i.e. not matched by the matcher).
// - update all items to have whatever tags they should have.
//
function mergeItems() {
  const START = '🏗   ' + colors.yellow(`Merging items...`);
  const END = '👍  ' + colors.green(`done merging`);
  console.log('');
  console.log(START);
  console.time(END);


  ['brands', 'operators', 'transit'].forEach(tree => {
    let total = 0;
    let totalNew = 0;

    //
    // INSERT - Look in `_keep` for new items not yet in the tree..
    //
    Object.keys(_keep[tree]).forEach(kvn => {
      const parts = kvn.split('|', 2);     // kvn = "key/value|name"
      const kv = parts[0];
      const n = parts[1];
      const parts2 = kv.split('/', 2);
      const k = parts2[0];
      const v = parts2[1];
      const tkv = `${tree}/${k}/${v}`;

      const m = matcher.match(k, v, n);
      if (m) return;     // already in the index

      // A new item!
      let item = { tags: {} };
      item.displayName = n;
      item.locationSet = { include: ['001'] };   // the whole world
      item.tags[k] = v;     // assign default tag k=v

      // Perform tree-specific tag defaults here..
      if (tree === 'brands') {
        item.tags.brand = n;
        item.tags.name = n;

      } else if (tree === 'operators') {
        item.tags.operator = n;

      } else if (tree === 'transit') {
        item.tags.network = n;
        item.tags.operator = n;
      }

      // Insert into index..
      if (!_cache.path[tkv])  _cache.path[tkv] = [];
      _cache.path[tkv].push(item);
      totalNew++;
    });


    //
    // UPDATE - Check all items in the tree for expected tags..
    //
    const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === tree);
    paths.forEach(tkv => {
      let items = _cache.path[tkv];
      if (!Array.isArray(items) || !items.length) return;

      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const k = parts[1];
      const v = parts[2];
      const kv = `${k}/${v}`;

      items.forEach(item => {
        total++;
        let tags = item.tags;
        let name = '';   // which "name" we use for the locales check below

        // Perform tree-specific tag cleanups here..
        if (tree === 'brands') {
          name = tags.brand || tags.name;
          // assign some default tags if missing
          if (kv === 'amenity/cafe') {
            if (!tags.takeaway)    tags.takeaway = 'yes';
            if (!tags.cuisine)     tags.cuisine = 'coffee_shop';
          } else if (kv === 'amenity/fast_food') {
            if (!tags.takeaway)    tags.takeaway = 'yes';
          } else if (kv === 'amenity/pharmacy') {
            if (!tags.healthcare)  tags.healthcare = 'pharmacy';
          }

        } else if (tree === 'operators') {
          name = tags.operator || tags.brand;
          // seed operators  (for a file that we copied over from the 'brand' tree)  // todo: remove?
          Object.keys(tags).forEach(osmkey => {
            if (/brand/.test(osmkey)) {  // convert `brand`->`operator`, `brand:ru`->`operator:ru`, etc.
              let newkey = osmkey.replace('brand', 'operator');
              if (!tags[newkey]) tags[newkey] = tags[osmkey];
            }
          });


        } else if (tree === 'transit') {
          name = tags.network;
          // if the operator is the same as the network, copy any missing *:wikipedia/*:wikidata tags
          if (tags.network && tags.operator && tags.network === tags.operator) {
            if (!tags['operator:wikidata'] && tags['network:wikidata'])    tags['operator:wikidata'] = tags['network:wikidata'];
            if (!tags['operator:wikipedia'] && tags['network:wikipedia'])  tags['operator:wikipedia'] = tags['network:wikipedia'];
            if (!tags['network:wikidata'] && tags['operator:wikidata'])    tags['network:wikidata'] = tags['operator:wikidata'];
            if (!tags['network:wikipedia'] && tags['operator:wikipedia'])  tags['network:wikipedia'] = tags['operator:wikipedia'];
          }
        }

        // If the name can only be reasonably read in one country.
        // Assign `locationSet`, and localize tags like `name:xx`
        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
          // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
          if (!item.locationSet)  item.locationSet = { include: ['il'] };
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

        // regenerate id here, in case the locationSet has changed
        const locationID = loco.validateLocationSet(item.locationSet).id;
        item.id = idgen(item, tkv, locationID);
      });
    });

    console.log(`📦  ${tree}:\t${total} total, ${totalNew} new`);

  });

  console.timeEnd(END);

  function setLanguageTags(tags, code) {
    if (tags.name)      tags[`name:${code}`] = tags.name;
    if (tags.brand)     tags[`brand:${code}`] = tags.brand;
    if (tags.operator)  tags[`operator:${code}`] = tags.operator;
    if (tags.network)   tags[`network:${code}`] = tags.network;
  }
}


//
// checkItems()
// Checks all the items for several kinds of issues
//
function checkItems(tree) {
  console.log('');
  console.log('🏗   ' + colors.yellow(`Checking ${tree}...`));

  const icon = {
    brands:    '🍔',
    operators: '💼',
    transit:   '🚅'
  }[tree];

  const wdTag = {
    brands:    'brand:wikidata',
    operators: 'operator:wikidata',
    transit:   'network:wikidata'
  }[tree];

  const oddPunctuation = /[\s\=!"#%'*{},.\/:?\(\)\[\]@\\$\^*+<>~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g;

  let warnMatched = matcher.getWarnings();
  let warnDuplicate = [];
  let warnFormatWikidata = [];
  let warnFormatWikipedia = [];
  let warnMissingTag = [];
  let warnFormatTag = [];
  let seenName = {};

  let total = 0;      // total items
  let totalWd = 0;    // total items with wikidata

  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === tree);
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

      total++;
      if (tags[wdTag]) totalWd++;

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


// TODO ?
  //     // Warn about "new" (no wikidata) items that may duplicate an "existing" (has wikidata) item.
  //     // The criteria for this warning is:
  //     // - One of the items has no `brand:wikidata`
  //     // - The items have nearly the same name
  //     // - The items have the same locationSet (or the one without wikidata is worldwide)
  //     const name = tags.name || tags.brand;
  //     const stem = stemmer(name) || name;
  //     const itemwd = tags[wdTag];
  //     const itemls = loco.validateLocationSet(item.locationSet).id;

  //     if (!seenName[stem]) seenName[stem] = new Set();
  //     seenName[stem].add(item);

  //     if (seenName[stem].size > 1) {
  //       seenName[stem].forEach(other => {
  //         if (other.id === item.id) return;   // skip self
  //         const otherwd = other.tags[wdTag];
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

  const pctWd = total > 0 ? (totalWd * 100 / total).toFixed(1) : 0;

  console.log('');
  console.info(colors.blue.bold(`${icon}  ${tree}/* completeness:`));
  console.info(colors.blue.bold(`    ${total} total`));
  console.info(colors.blue.bold(`    ${totalWd} (${pctWd}%) with a '${wdTag}' tag`));
}
