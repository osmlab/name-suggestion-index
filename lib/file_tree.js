const colors = require('colors/safe');
const fs = require('fs-extra');
const glob = require('glob');
const sort = require('./sort.js');
const stringify = require('json-stringify-pretty-compact');

// validate the files as we read them
const validate = require('./validate.js');
const entriesSchema = require('../schema/entries.json');


exports.read = (tree, loco) => {
  console.log(`\nreading ${tree}`);
  console.time(colors.green(`${tree} loaded`));

  let obj = {};
  glob.sync(`./${tree}/**/*.json`).forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    let json;
    try {
      json = JSON.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    validate(file, json, entriesSchema);

    Object.keys(json).forEach(k => {
      const source = json[k];
      // validate locationSets, if we were passed a LocationConflation instance
      if (loco && source.locationSet) {
        (source.locationSet.include || []).forEach(location => {
          if (!loco.validateLocation(location)) {
            console.error(colors.red('Error - Invalid include location: ') + colors.yellow(location));
            console.error('  ' + colors.yellow(file));
            process.exit(1);
          }
        });

        (source.locationSet.exclude || []).forEach(location => {
          if (!loco.validateLocation(location)) {
            console.error(colors.red('Error - Invalid exclude location: ') + colors.yellow(location));
            console.error('  ' + colors.yellow(file));
            process.exit(1);
          }
        });
      }

      obj[k] = source;
    });
  });

  console.timeEnd(colors.green(`${tree} loaded`));
  return obj;
};


exports.write = (tree, obj) => {
  console.log('\nwriting ' + tree);
  console.time(colors.green(`${tree} updated`));
  let dict = {};


  // populate K-V dictionary
  Object.keys(obj).forEach(k => {
    const parts = k.split('|', 2);
    const tag = parts[0].split('/', 2);
    const key = tag[0];
    const value = tag[1];

    dict[key] = dict[key] || {};
    dict[key][value] = dict[key][value] || {};
    dict[key][value][k] = sort(obj[k]);

    // perform cleanups
    let current = dict[key][value][k];

    if (current.locationSet) {
      let cleaned = {};
      if (current.locationSet.include) {
        cleaned.include = current.locationSet.include.sort().map(item => item.toLowerCase());
      }
      if (current.locationSet.exclude) {
        cleaned.exclude = current.locationSet.exclude.sort().map(item => item.toLowerCase());
      }
      current.locationSet = cleaned;
    }

    if (current.tags) {
      current.tags = sort(current.tags);
    }

    ['matchNames', 'matchTags'].forEach(prop => {
      if (current[prop]) {
        current[prop] = current[prop].map(item => item.toLowerCase());
      }
    });
  });

  Object.keys(dict).forEach(k => {
    const entry = dict[k];
    Object.keys(entry).forEach(v => {
      const file = `./${tree}/${k}/${v}.json`;
      try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, stringify(sort(dict[k][v]), { maxLength: 50 }));
      } catch (err) {
        console.error(colors.red(`Error - ${err.message} writing:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
    });
  });

  console.timeEnd(colors.green(`${tree} updated`));
};
