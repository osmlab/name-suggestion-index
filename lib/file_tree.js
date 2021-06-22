// External
import colors from 'colors/safe.js';
import fs from 'fs-extra';
import glob from 'glob';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import stringify from '@aitodotai/json-stringify-pretty-compact';
const withLocale = localeCompare('en-US');

// Internal
import { idgen } from './idgen.js';
import { sortObject } from './sort_object.js';
import { validate } from './validate.js';

// JSON
import treesJSON from '../config/trees.json';
const trees = treesJSON.trees;
import categoriesSchemaJSON from '../schema/categories.json';


// The code in here
//  - validates data on read, generating any missing data
//  - cleans data on write, sorting and lowercasing all the keys and arrays

// cache: {
//   'id': {                      // `cache.id` is a Map of item id -> items
//     'firstbank-978cca': {…},
//     …
//   },
//   'path': {                    // `cache.path` is an Object of t/k/v paths -> category data
//     'brands/amenity/bank': {
//       'properties':  {…},
//       'items':       […],
//       'templates':   […]
//     }
//   },


export let fileTree = {

read: (cache, loco) => {
  cache = cache || {};
  cache.id = cache.id || new Map();
  cache.path = cache.path || {};

  Object.keys(trees).forEach(t => {
    const tree = trees[t];
    let itemCount = 0;
    let fileCount = 0;

    glob.sync(`./data/${t}/**/*`, { nodir: true }).forEach(file => {
      if (!/\.json$/.test(file)) {
        console.error(colors.red(`Error - file should have a .json extension:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }

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
      validate(file, input, categoriesSchemaJSON);

      let seenkv = {};

      const properties = input.properties || {};
      const tkv = properties.path;
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const k = parts[1];
      const v = parts[2];
      const kv = `${k}/${v}`;

      // make sure t/k/v is unique
      if (cache.path[tkv]) {
        console.error(colors.red(`Error - '${tkv}' found in multiple files.`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      } else {
        cache.path[tkv] = { properties: properties, items: [], templates: [] };
      }

      // make sure each k/v pair appears in only one tree
      const other = seenkv[kv];
      if (other && other !== t) {
        console.error(colors.red(`Error - '${kv}' found in multiple trees: ${other} and ${t}.`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      } else {
        seenkv[kv] = t;
      }

      // check and merge each item
      let seenName = {};

      let items = input.items || [];
      items.forEach(item => {
        itemCount++;

        if (item.templateSource) {    // It's a template item
          cache.path[tkv].templates.push(item);
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
          const resolved = loco.resolveLocationSet(item.locationSet);
          locationID = resolved.id;
          if (!resolved.feature.geometry.coordinates.length || !resolved.feature.properties.area) {
            throw new Error(`locationSet ${locationID} resolves to an empty feature.`);
          }
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
        if (cache.id.has(item.id)) {
          console.error(colors.red(`Error - Duplicate id '${item.id}' in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        } else {
          cache.path[tkv].items.push(item);
          cache.id.set(item.id, item);
        }
      });
    });

    console.log(`${tree.emoji}  ${t}:\tLoaded ${itemCount} items in ${fileCount} files`);
  });

  return cache;
},


write: (cache) => {
  cache = cache || {};
  cache.path = cache.path || {};

  Object.keys(trees).forEach(t => {
    const tree = trees[t];
    let itemCount = 0;
    let fileCount = 0;

    Object.keys(cache.path).forEach(tkv => {
      if (tkv.split('/')[0] !== t) return;

      const category = cache.path[tkv];
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const v = parts[2];

      const file = `./data/${tkv}.json`;
      fileCount++;

      let templateItems = category.templates || [];
      let normalItems = category.items || [];
      if (!templateItems.length && !normalItems.length) return;   // nothing to do

      templateItems = templateItems
        .sort((a, b) => withLocale(a.templateSource, b.templateSource))   // sort templateItems by templateSource
        .map(item => {
          itemCount++;

          // clean templateInclude/templateExclude
          if (item.templateInclude) {
            item.templateInclude = item.templateInclude.map(s => s.toLowerCase()).sort(withLocale);
          }
          if (item.templateExclude) {
            item.templateExclude = item.templateExclude.map(s => s.toLowerCase()).sort(withLocale);
          }

          // clean templateSource
          item.templateSource = _clean(item.templateSource);

          // clean templateTags
          let cleaned = {};
          Object.keys(item.templateTags).forEach(k => {
            const osmkey = _clean(k);
            const osmval = _clean(item.templateTags[k]);
            cleaned[osmkey] = osmval;
          });
          item.templateTags = sortObject(cleaned);

          return sortObject(item);
        });

      normalItems = normalItems
        .filter(item => !item.fromTemplate)
        .sort((a, b) => withLocale(a.displayName, b.displayName))   // sort normalItems by displayName
        .map(item => {
          itemCount++;
          // clean displayName
          item.displayName = _clean(item.displayName);

          // clean locationSet
          let cleaned = {};
          if (Array.isArray(item.locationSet.include)) {
            cleaned.include = item.locationSet.include.map(_cleanLower).sort(withLocale);
          } else {
            cleaned.include = ['001'];  // default to world
          }
          if (Array.isArray(item.locationSet.exclude)) {
            cleaned.exclude = item.locationSet.exclude.map(_cleanLower).sort(withLocale);
          }
          item.locationSet = cleaned;

          // clean matchNames/matchTags
          ['matchNames', 'matchTags'].forEach(prop => {
            if (item[prop]) {
              item[prop] = item[prop].map(_cleanLower).sort(withLocale);
            }
          });

          // clean OSM tags
          cleaned = {};
          Object.keys(item.tags).forEach(k => {
            const osmkey = _clean(k);
            const osmval = _clean(item.tags[k]);
            cleaned[osmkey] = osmval;
          });
          item.tags = sortObject(cleaned);

          return sortObject(item);
        });


      // clean category properties
      let properties = category.properties || {};
      properties.exclude = properties.exclude || {};

      let cleanedProps = {};
      cleanedProps.path = tkv;

      if (properties.skipCollection) {
        cleanedProps.skipCollection = properties.skipCollection;
      }
      if (Array.isArray(properties.preserveTags)) {
        cleanedProps.preserveTags = properties.preserveTags.map(_cleanLower).sort(withLocale);
      }

      cleanedProps.exclude = {};
      if (Array.isArray(properties.exclude.generic)) {
        cleanedProps.exclude.generic = properties.exclude.generic.map(_cleanLower).sort(withLocale);
      } else {
        const v2 = v.replace(/_/g, ' ');    // add the value as a generic name exclude (e.g. 'restaurant')
        cleanedProps.exclude.generic = [`^${v2}$`];
      }
      if (Array.isArray(properties.exclude.named)) {
        cleanedProps.exclude.named = properties.exclude.named.map(_cleanLower).sort(withLocale);
      }


      // generate file
      const output = {
        properties: cleanedProps,
        items: templateItems.concat(normalItems)
      };

      try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, stringify(output, { maxLength: 50 }) + '\n');
      } catch (err) {
        console.error(colors.red(`Error - ${err.message} writing:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
    });

    console.log(`${tree.emoji}  ${t}:\tWrote ${itemCount} items in ${fileCount} files`);

  });


  function _clean(val) {
    if (typeof val !== 'string') return val;
    return val.trim();
  }
  function _cleanLower(val) {
    if (typeof val !== 'string') return val;
    return val.trim().toLowerCase();
  }
},


expandTemplates: (cache, loco) => {
  cache = cache || {};
  cache.id = cache.id || new Map();
  cache.path = cache.path || {};

  Object.keys(cache.path).forEach(tkv => {
    const file = `./data/${tkv}.json`;
    const templateItems = cache.path[tkv].templates || [];

    // expand each template item into real items..
    templateItems.forEach(templateItem => {
      const includePatterns = (templateItem.templateInclude || []).map(s => new RegExp(s, 'i'));
      const excludePatterns = (templateItem.templateExclude || []).map(s => new RegExp(s, 'i'));
      const templateSource = templateItem.templateSource;
      const templateTags = templateItem.templateTags;

      const sourceItems = cache.path[templateSource].items;
      if (!Array.isArray(sourceItems)) {
        console.error(colors.red(`Error - template item references invalid source path '${templateSource}' in:`));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }

      sourceItems.forEach(sourceItem => {
        if (includePatterns.length) {
          if (!includePatterns.some(pattern => pattern.test(sourceItem.id))) return;
        }
        if (excludePatterns.length) {
          if (excludePatterns.some(pattern => pattern.test(sourceItem.id))) return;
        }

        let item = JSON.parse(JSON.stringify(sourceItem));  // deep clone
        delete item.matchTags;     // don't copy matchTags (but do copy matchNames)
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
        if (cache.id.has(item.id)) {
          console.error(colors.red(`Error - Duplicate id '${item.id}' in:`));
          console.error('  ' + colors.yellow(item.displayName));
          console.error('  ' + colors.yellow(file));
          process.exit(1);
        } else {
          cache.path[tkv].items.push(item);
          cache.id.set(item.id, item);
        }
      });

    });
  });

  return cache;
}

};
