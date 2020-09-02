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


exports.read = (tree, all, loco) => {
  all = all || {};
  console.log(`\nreading ${tree}`);
  console.time(colors.green(`${tree} loaded`));

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

    validate(file, input, entriesSchema);

    Object.keys(input).forEach(fileID => {
      const parts = fileID.split('/', 3);
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];

      input[fileID].forEach(item => {
        // validate locationSets
        if (item.locationSet) {
          try {
            loco.validateLocationSet(item.locationSet);
          } catch (err) {
            console.error(colors.red(`Error - ${err.message} in:`));
            console.error('  ' + colors.yellow(file));
            process.exit(1);
          }
        }

        // merge into all
        if (!all[t])        all[t] = {};
        if (!all[t][k])     all[t][k] = {};
        if (!all[t][k][v])  all[t][k][v] = input[fileID];
      });
    });

  });


  console.timeEnd(colors.green(`${tree} loaded`));
  return all;
};


exports.write = (tree, all, loco) => {
  all = all || {};
  console.log(`\nwriting ${tree}`);
  console.time(colors.green(`${tree} updated`));

  const t = tree;
  const entries = all[t] || {};

  Object.keys(entries).sort().forEach(k => {
    Object.keys(entries[k]).sort().forEach(v => {
      const fileID = `${t}/${k}/${v}`;
      const file = `./${fileID}.json`;

      let seen = {};

      // clean the items
      entries[k][v].forEach(item => {

        // clean locationSet
        let cleaned = item.locationSet || {};
        if (item.locationSet.include) {
          cleaned.include = item.locationSet.include.sort().map(val => val.toLowerCase());
        } else {
          cleaned.include = ['001'];  // default to world
        }
        if (item.locationSet.exclude) {
          cleaned.exclude = item.locationSet.exclude.sort().map(val => val.toLowerCase());
        }
        item.locationSet = cleaned;

        // clean tags
        if (item.tags) {
          item.tags = sort(item.tags);
        }

        // clean props
        ['matchNames', 'matchTags'].forEach(prop => {
          if (item[prop]) {
            item[prop] = item[prop].map(val => val.toLowerCase());
          }
        });

        // generate id
        let name = item.tags.name || item.tags.brand;
        let simple = simplify(name);
        let locationID;
        try {
          locationID = loco.validateLocationSet(item.locationSet).id;
        } catch (err) {
          console.error(colors.red(`Error - ${err.message} for:`));
          console.error('  ' + colors.yellow(`${item.displayName}`));
          console.error('  ' + colors.yellow(`${file}`));
          process.exit(1);
        }
        const uniqueID = `${fileID} ${locationID}`;
        const hash = crypto.createHash('md5').update(uniqueID).digest('hex').slice(0, 6);
        item.id = `${simple}-${hash}`;

        // generate displayName
        if (item.displayName && !seen[item.displayName]) {
          seen[item.displayName] = true;
        } else {
          for (let i = 0; seen[name]; i++) {
            name = `${name}-${i}`;   // cycle name until we generate one that we haven't seen yet
          }
          seen[name] = true;
          item.displayName = name;
        }
      });


      let output = {};
      output[fileID] = entries[k][v].sort((a, b) => a.displayName.localeCompare(b.displayName));

      try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, stringify(output, { maxLength: 50 }));
      } catch (err) {
        console.error(colors.red(`Error - ${err.message} writing:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
    });
  });

  console.timeEnd(colors.green(`${tree} updated`));
};
