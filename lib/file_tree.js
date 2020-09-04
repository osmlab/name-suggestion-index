const colors = require('colors/safe');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('glob');
const JSON5 = require('json5');
const simplify = require('./simplify.js');
const sort = require('./sort.js');
const stringify = require('json-stringify-pretty-compact');

// validate the files as we read them
const validate = require('./validate.js');
const entriesSchema = require('../schema/entries.json');

// HACK - remove
let counter=0;

// The code in here
//  - validates data on read, generating any missing data
//  - cleans data on write, sorting and lowercasing all the keys and arrays


exports.read = (tree, cache, loco) => {
  cache = cache || { path: {}, id: {} };
  if (!cache.path[tree])  cache.path[tree] = {};

  const START = '🏗   ' + colors.yellow(`Reading ${tree}`);
  const END = '👍  ' + colors.green(`${tree} loaded`);
  console.log('');
  console.log(START);
  console.time(END);

  // what tag should we try to use as the name if there is no name?
  const fallbackName = {
    'brands': 'brand',
    'operators': 'operator',
    'networks': 'network'
  }[tree];

  glob.sync(`./${tree}/**/*.json`).forEach(file => {
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

    Object.keys(input).forEach(fileID => {
      const parts = fileID.split('/', 3);     // fileID looks like "tree/key/value"
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];
      const kv = `${k}/${v}`;
      let seenName = {};
      cache.path[tree][kv] = [];

      // check and merge each item
      input[fileID].forEach(item => {

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
        const name = item.tags.name || item.tags[fallbackName];
        if (!name) {
          console.error(colors.red(`Error - Missing 'name' or '${fallbackName}' tag for '${item.displayName}' in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        }
        const simplename = simplify(name);
        const message = `${fileID} ${locationID}`;
        const hash = crypto.createHash('md5').update(message).digest('hex').slice(0, 6);
        item.id = `${simplename}-${hash}`;

        // merge into caches
        const existing = cache.id[item.id];
        if (existing) {
// HACK - for now we are going to do a bad hacky thing to force them in instead of failing
item.id = item.id + '-' + (counter++);
          console.error(colors.red(`Error - Duplicate id '${item.id}' in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          // process.exit(1);
        }
//        else {
          cache.id[item.id] = item;
          cache.path[tree][kv].push(item);
//        }
      });
    });
  });

  console.timeEnd(END);
  return cache;
};


exports.write = (tree, cache, loco) => {
  const data = cache.path && cache.path[tree];
  if (!data) {
    console.error(colors.red(`Error - No data to write for ${tree}`));
    process.exit(1);
  }

  const START = '🏗   ' + colors.yellow(`Writing ${tree}`);
  const END = '👍  ' + colors.green(`${tree} updated`);
  console.log('');
  console.log(START);
  console.time(END);

  Object.keys(data).forEach(kv => {
    if (!Array.isArray(data[kv])) return;
    const parts = kv.split('/', 2);
    const k = parts[0];
    const v = parts[1];
    const fileID = `${tree}/${k}/${v}`;
    const file = `./${fileID}.json`;

    let output = {};
    output[fileID] = data[kv]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))   // sort array of items by displayName
      .map(item => {
        // clean locationSet
        let cleaned = {};
        if (item.locationSet.include) {
          cleaned.include = item.locationSet.include.sort().map(val => val.toLowerCase());
        } else {
          cleaned.include = ['001'];  // default to world
        }
        if (item.locationSet.exclude) {
          cleaned.exclude = item.locationSet.exclude.sort().map(val => val.toLowerCase());
        }
        item.locationSet = cleaned;

        // clean props
        ['matchNames', 'matchTags'].forEach(prop => {
          if (item[prop]) {
            item[prop] = item[prop].map(val => val.toLowerCase());
          }
        });

        // clean tags
        item.tags = sort(item.tags);

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

  console.timeEnd(END);
};
