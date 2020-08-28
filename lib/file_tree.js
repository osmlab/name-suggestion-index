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


exports.read = (tree, loco) => {
  console.log(`\nreading ${tree}`);
  console.time(colors.green(`${tree} loaded`));

  let all = {};
  glob.sync(`./${tree}/**/*.json`).forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    let json;
    try {
      json = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} reading:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

  //   validate(file, json, entriesSchema);

////// legacy
    Object.keys(json).forEach(k => {
      const entry = json[k];

      // validate locationSets, if we were passed a LocationConflation instance
      if (loco && entry.locationSet) {
        try {
          loco.validateLocationSet(entry.locationSet);
        } catch (err) {
          console.error(colors.red(`Error - ${err.message} in:`));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        }
      }

      all[k] = entry;
    });


////// new
    // Object.keys(json).forEach(k => {
    //   Object.keys(json[k]).forEach(v => {
    //     Object.keys(json[k][v]).forEach(displayName => {
    //       const entry = json[k][v][displayName];

    //       // validate locationSets, if we were passed a LocationConflation instance
    //       if (loco && entry.locationSet) {
    //         try {
    //           loco.validateLocationSet(entry.locationSet);
    //         } catch (err) {
    //           console.error(colors.red(`Error - ${err.message} in:`));
    //           console.error('  ' + colors.yellow(file));
    //           process.exit(1);
    //         }
    //       }
    //     });

    //     // merge into all
    //     if (!all[k])     all[k] = {};
    //     if (!all[k][v])  all[k][v] = json[k][v];
    //   });
    // });

  });


  console.timeEnd(colors.green(`${tree} loaded`));
  return all;
};


exports.write = (tree, all, loco) => {
  console.log(`\nwriting ${tree}`);
  console.time(colors.green(`${tree} updated`));
  let dict = {};

//////// legacy

  // populate K-V dictionary
  Object.keys(all).forEach(kvnd => {
    const parts = kvnd.split('|', 2);
    const tag = parts[0].split('/', 2);
    const key = tag[0];
    const value = tag[1];

    dict[key] = dict[key] || {};
    dict[key][value] = dict[key][value] || {};
    dict[key][value][kvnd] = sort(all[kvnd]);

    // perform cleanups
    let current = dict[key][value][kvnd];


// UPDATES HERE
    // generate id
    let name = current.tags.name || current.tags.brand;
    let simple = simplify(name);
    let locationID;
    try {
      locationID = loco.validateLocationSet(current.locationSet).id;
    } catch (err) {
      console.error(colors.red(`Error - ${err.message} for:`));
      console.error('  ' + colors.yellow(`${kvnd}`));
      console.error('  ' + colors.yellow(`./${tree}/${key}/${value}.json`));
      process.exit(1);
    }
    let uniqueID = `${tree} ${key} ${value} ${locationID}`;
    let hash = crypto.createHash('md5').update(uniqueID).digest('hex').slice(0, 6);

    current.displayName = parts[1].replace('~', ' ');
    current.id = `${simple}-${hash}`;
    current.oldid = kvnd;

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

//////// legacy

  // Object.keys(dict).forEach(k => {
  //   const entry = dict[k];
  //   Object.keys(entry).forEach(v => {
  //     const file = `./${tree}/${k}/${v}.json`;
  //     let output = {};
  //     output[k] = {};
  //     output[k][v] = sort(dict[k][v]);

  //     try {
  //       fs.ensureFileSync(file);
  //       fs.writeFileSync(file, stringify(output, { maxLength: 50 }));
  //     } catch (err) {
  //       console.error(colors.red(`Error - ${err.message} writing:`));
  //       console.error('  ' + colors.yellow(file));
  //       process.exit(1);
  //     }
  //   });
  // });

///////// UPDATES HERE

  Object.keys(dict).forEach(k => {
    const entry = dict[k];
    Object.keys(entry).forEach(v => {
      const file = `./${tree}/${k}/${v}.json`;
      let output = {};
      output[k] = {};
      output[k][v] = [];

      Object.keys(dict[k][v]).sort().forEach(kvnd => {
        let entry = dict[k][v][kvnd];
        output[k][v].push(sort(entry));
      });

      sort(dict[k][v]);

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


//////// new

  // Object.keys(all).sort().forEach(k => {
  //   Object.keys(all[k]).sort().forEach(v => {

  //     const file = `./${tree}/${k}/${v}.json`;
  //     let output = {};
  //     output[k] = {};
  //     output[k][v] = [];

  //     Object.keys(all[k][v]).sort().forEach(id => {
  //       let entry = all[k][v][id];
  //       // let newid = entry.id;
  //       entry.displayName = id;

  //       // const parts = entry.oldid.split('|', 2);
  //       // const displayname = parts[1].replace('~', ' ');
  //       // output[k][v][displayname] = sort(entry);
  //       output[k][v].push(sort(entry));
  //     });

  //     try {
  //       fs.ensureFileSync(file);
  //       fs.writeFileSync(file, stringify(output, { maxLength: 50 }));
  //     } catch (err) {
  //       console.error(colors.red(`Error - ${err.message} writing:`));
  //       console.error('  ' + colors.yellow(file));
  //       process.exit(1);
  //     }
  //   });
  // });

  console.timeEnd(colors.green(`${tree} updated`));
};
