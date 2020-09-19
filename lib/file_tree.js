const colors = require('colors/safe');
const fs = require('fs-extra');
const glob = require('glob');
const idgen = require('./idgen.js');
const JSON5 = require('json5');
const sort = require('./sort.js');
const stringify = require('json-stringify-pretty-compact');

// validate the files as we read them
const validate = require('./validate.js');
const entriesSchema = require('../schema/entries.json');

// The code in here
//  - validates data on read, generating any missing data
//  - cleans data on write, sorting and lowercasing all the keys and arrays


exports.read = (tree, cache, loco) => {
  cache = cache || { path: {}, id: {} };

  const START = '🏗   ' + colors.yellow(`Reading ${tree}`);
  const END = '👍  ' + colors.green(`${tree} loaded`);
  console.log('');
  console.log(START);
  console.time(END);

  let itemCount = 0;
  let fileCount = 0;

  glob.sync(`./${tree}/**/*.json`).forEach(file => {
    fileCount++;
    const contents = fs.readFileSync(file, 'utf8');
    let input;
    try {
      input = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    // check JSON schema
    validate(file, input, entriesSchema);

    Object.keys(input).forEach(tkv => {
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const k = parts[1];
      const v = parts[2];
      let seenName = {};
      cache.path[tkv] = [];

      // check and merge each item
      input[tkv].forEach(item => {
        itemCount++;

        // check displayName for uniqueness within this category
        if (seenName[item.displayName]) {
          console.error(colors.red(`Error - duplicate displayName '${item.displayName}' in:`));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        } else {
          seenName[item.displayName] = true;
        }

        // check locationSet
        let locationID;
        try {
          locationID = loco.validateLocationSet(item.locationSet).id;
        } catch (err) {
          console.error(colors.red(`Error - ${err.message} in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        }

        // check tags
        item.tags[k] = v;    // sanity check: `k=v` must exist as a tag.

        // generate id
        item.id = idgen(item, tkv, locationID);
        if (!item.id) {
          console.error(colors.red(`Error - Couldn't generate an id for:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        }

        // merge into caches
        const existing = cache.id[item.id];
        if (existing) {
          console.error(colors.red(`Error - Duplicate id '${item.id}' in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        } else {
          cache.id[item.id] = item;
          cache.path[tkv].push(item);
        }
      });
    });
  });

  console.log(`📦  ${itemCount} items in ${fileCount} files`);
  console.timeEnd(END);
  return cache;
};


exports.write = (tree, cache) => {
  cache = cache || { path: {}, id: {} };
  const paths = Object.keys(cache.path).filter(tkv => tkv.split('/')[0] === tree);

  if (!paths.length) {
    console.error(colors.red(`Error - No data to write for ${tree}`));
    process.exit(1);
  }

  const START = '🏗   ' + colors.yellow(`Writing ${tree}`);
  const END = '👍  ' + colors.green(`${tree} updated`);
  console.log('');
  console.log(START);
  console.time(END);

  let itemCount = 0;
  let fileCount = 0;

  paths.forEach(tkv => {
    fileCount++;
    let items = cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;
    const file = `./${tkv}.json`;

    let output = {};
    output[tkv] = items
      .sort((a, b) => a.displayName.localeCompare(b.displayName))   // sort array of items by displayName
      .map(item => {
        itemCount++;
        // clean displayName
        item.displayName = _clean(item.displayName);

        // clean locationSet
        let cleaned = {};
        if (item.locationSet.include) {
          cleaned.include = item.locationSet.include.map(_cleanLower).sort();
        } else {
          cleaned.include = ['001'];  // default to world
        }
        if (item.locationSet.exclude) {
          cleaned.exclude = item.locationSet.exclude.map(_cleanLower).sort();
        }
        item.locationSet = cleaned;

        // clean matchNames/matchTags
        ['matchNames', 'matchTags'].forEach(prop => {
          if (item[prop]) {
            item[prop] = item[prop].map(_cleanLower).sort();
          }
        });

        // clean OSM tags
        cleaned = {};
        Object.keys(item.tags).forEach(k => {
          const osmkey = _clean(k);
          const osmval = _clean(item.tags[k]);
          cleaned[osmkey] = osmval;
        });
        item.tags = sort(cleaned);

        return sort(item);
      });

    try {
      fs.ensureFileSync(file);
      fs.writeFileSync(file, stringify(output, { maxLength: 50 }));
    } catch (err) {
      console.error(colors.red(`Error - ${err.message} writing:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }
  });

  console.log(`📦  ${itemCount} items in ${fileCount} files`);
  console.timeEnd(END);


  function _clean(str) {
    return str.trim().replace(/[\u200B-\u200F\uFEFF]/g, '');
  }
  function _cleanLower(str) {
    return str.trim().replace(/[\u200B-\u200F\uFEFF]/g, '').toLowerCase();
  }
};
