const colors = require('colors/safe');
const fs = require('fs-extra');
const glob = require('glob');
const idgen = require('./idgen.js');
const JSON5 = require('json5');
const sort = require('./sort.js');
const stringify = require('json-stringify-pretty-compact');

// metadata about the trees
const trees = require('../config/trees.json').trees;

// validate the files as we read them
const validate = require('./validate.js');
const itemsSchema = require('../schema/items.json');

// The code in here
//  - validates data on read, generating any missing data
//  - cleans data on write, sorting and lowercasing all the keys and arrays


exports.read = (cache, loco) => {
  cache = cache || {};
  cache.id = cache.id || {};
  cache.path = cache.path || {};
  cache.template = cache.template || {};

  let itemCount = 0;
  let fileCount = 0;

  Object.keys(trees).forEach(t => {
    const tree = trees[t];

    glob.sync(`./data/${t}/**/*.json`).forEach(file => {
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
      validate(file, input, itemsSchema);

      Object.keys(input).forEach(tkv => {
        const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
        const k = parts[1];
        const v = parts[2];
        let seenName = {};

        // check and merge each item
        input[tkv].forEach(item => {
          itemCount++;

          if (item.templateSource) {    // It's a template item
            if (!cache.template[tkv]) cache.template[tkv] = [];
            cache.template[tkv].push(item);
            return;
          }

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
            if (!cache.path[tkv]) cache.path[tkv] = [];
            cache.path[tkv].push(item);
            cache.id[item.id] = item;
          }
        });
      });
    });

    console.log(`${tree.emoji}  ${t}:\tLoaded ${itemCount} items in ${fileCount} files`);
  });

  return cache;
};


exports.write = (cache) => {
  cache = cache || {};
  cache.id = cache.id || {};
  cache.path = cache.path || {};
  cache.template = cache.template || {};

  Object.keys(trees).forEach(t => {
    const tree = trees[t];

    // gather paths used by normal items and template items..
    const paths = new Set();
    Object.keys(cache.path).forEach(tkv => { if (tkv.split('/')[0] === t) paths.add(tkv); });
    Object.keys(cache.template).forEach(tkv => { if (tkv.split('/')[0] === t) paths.add(tkv); });

    if (!paths.size) {
      console.error(colors.red(`Error - No data to write for ${t}`));
      process.exit(1);
    }

    let itemCount = 0;
    let fileCount = 0;

    paths.forEach(tkv => {
      fileCount++;

      let templateItems = cache.template[tkv] || [];
      let normalItems = cache.path[tkv] || [];
      if (!templateItems.length && !normalItems.length) return;   // nothing to do

      const file = `./data/${tkv}.json`;

      templateItems = templateItems
        .sort((a, b) => a.templateSource.localeCompare(b.templateSource))   // sort templateItems by templateSource
        .map(item => {
          itemCount++;
          // clean templateSource
          item.templateSource = _clean(item.templateSource);

          // clean templateTags
          let cleaned = {};
          Object.keys(item.templateTags).forEach(k => {
            const osmkey = _clean(k);
            const osmval = _clean(item.templateTags[k]);
            cleaned[osmkey] = osmval;
          });
          item.templateTags = sort(cleaned);

          return sort(item);
        });

      normalItems = normalItems
        .filter(item => !item.fromTemplate)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))   // sort normalItems by displayName
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


      let output = {};
      output[tkv] = templateItems.concat(normalItems);

      try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, stringify(output, { maxLength: 50 }));
      } catch (err) {
        console.error(colors.red(`Error - ${err.message} writing:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
    });

    console.log(`${tree.emoji}  ${t}:\tWrote ${itemCount} items in ${fileCount} files`);

  });


  function _clean(str) {
    return str.trim();
  }
  function _cleanLower(str) {
    return str.trim().toLowerCase();
  }
};


exports.expandTemplates = (cache, loco) => {
  cache = cache || {};
  cache.id = cache.id || {};
  cache.path = cache.path || {};
  cache.template = cache.template || {};

  // gather paths used by template items..
  const paths = Object.keys(cache.template) || [];

  paths.forEach(tkv => {
    const file = `./data/${tkv}.json`;
    let templateItems = cache.template[tkv] || [];

    // expand each template item into real items..
    templateItems.forEach(templateItem => {
      const templateSource = templateItem.templateSource;
      const templateTags = templateItem.templateTags;

      const sourceItems = cache.path[templateSource];
      if (!Array.isArray(sourceItems)) {
        console.error(colors.red(`Error - template item references invalid source path '${templateSource}' in:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }

      sourceItems.forEach(sourceItem => {
        let item = JSON.parse(JSON.stringify(sourceItem));  // deep clone
        item.fromTemplate = true;

        // replace tags
        let tags = item.tags;
        Object.keys(templateTags).forEach(osmkey => {
          let tagValue = templateTags[osmkey];

          if (tagValue) {
            tagValue = tagValue.replace(/{(\S+)}/g, (match, token) => {
              // token should contain something like 'source.tags.brand'
              let replacement = '';
              let props = token.split('.');
              props.shift();   // Ignore first 'source'. It's just for show.

              let source = sourceItem;
              while (props.length) {
                let prop = props.shift();
                let found = source[prop];
                if (typeof found === 'object' && found !== null) {
                  source = found;
                } else {
                  replacement = found;
                }
              }
              return replacement;
            });

            if (tagValue === 'undefined' || tagValue === 'null') {
              tagValue = '';   // wipe out bogus string replacements
            }
          }

          if (tagValue) {
            tags[osmkey] = tagValue;
          } else {
            delete tags[osmkey];
          }
        });

        // generate id
        let locationID = loco.validateLocationSet(item.locationSet).id;
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
          if (!cache.path[tkv]) cache.path[tkv] = [];
          cache.path[tkv].push(item);
          cache.id[item.id] = item;
        }
      });

    });
  });

  return cache;
};