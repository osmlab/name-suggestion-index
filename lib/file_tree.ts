import { Glob } from 'bun';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import stringify from 'json-stringify-pretty-compact';
import { styleText } from 'node:util';
import { Validator } from 'jsonschema';

import { idgen } from './idgen.ts';
import { sortObject } from './sort_object.ts';
import { validate } from './validate.ts';

import type { NsiCache } from './types.ts';
import type LocationConflation from '@rapideditor/location-conflation';

const withLocale = localeCompare('en-US');  // specify 'en-US' for stable results


/** Tree definitions loaded from `config/trees.json`. */
const treesJSON = await Bun.file('./config/trees.json').json();
const trees = treesJSON.trees;

/** JSON Schema for category files, loaded from `schema/categories.json`. */
const categoriesSchemaJSON = await Bun.file('./schema/categories.json').json();
const validator = new Validator();


/**
 * Utilities for reading, writing, and expanding NSI data files under `./data/`.
 *
 * - Validates data on read, generating any missing fields (ids, tags).
 * - Cleans data on write, sorting and lowercasing keys and arrays.
 * - Expands template items into concrete items.
 *
 * The cache structure is:
 * ```
 * {
 *   id:   Map<itemId, item>,
 *   path: {
 *     'brands/amenity/bank': { properties, items, templates },
 *     …
 *   }
 * }
 * ```
 */
export const fileTree = {

/**
 * Reads all NSI data files from `./data/`, validates them against the JSON
 * Schema, generates item ids, and populates the cache.
 *
 * @param   cache - The cache object to populate (created if falsy)
 * @param   loco  - A `LocationConflation` instance for validating locationSets
 * @returns The populated cache
 * @throws  Terminates via `process.exit(1)` on schema errors, duplicate paths,
 *          duplicate ids, invalid JSON, or unresolvable locationSets.
 */
read: async (cache: NsiCache, loco: LocationConflation) => {
  cache = cache || {};
  cache.id = cache.id || new Map();
  cache.path = cache.path || {};

  for (const t of Object.keys(trees)) {
    const tree = trees[t];
    let itemCount = 0;
    let fileCount = 0;

    const glob = new Glob(`./data/${t}/**/*`);
    for (const filepath of glob.scanSync()) {
      if (/\.md$/i.test(filepath)) continue;  // ignore markdown/readme files - #7292

      if (!/\.json$/.test(filepath)) {
        console.error(styleText('red', `Error - file should have a .json extension:`));
        console.error('  ' + styleText('yellow', filepath));
        process.exit(1);
      }

      fileCount++;
      const contents = await Bun.file(filepath).text();
      let input;
      try {
        input = JSON5.parse(contents);
      } catch (jsonParseError: unknown) {
        const message = jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError);
        console.error(styleText('red', `Error - ${message} reading:`));
        console.error('  ' + styleText('yellow', filepath));
        process.exit(1);
      }

      // check JSON schema
      validate(validator, filepath, input, categoriesSchemaJSON);

      const properties = input.properties || {};
      const tkv = properties.path;
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const k = parts[1];
      const v = parts[2];
      const kv = `${k}/${v}`;
      const seenkv: Record<string, string> = {};

      // make sure t/k/v is unique
      if (cache.path[tkv]) {
        console.error(styleText('red', `Error - '${tkv}' found in multiple files.`));
        console.error('  ' + styleText('yellow', filepath));
        process.exit(1);
      } else {
        cache.path[tkv] = { properties: properties, items: [], templates: [] };
      }

      // make sure each k/v pair appears in only one tree
      const other = seenkv[kv];
      if (other && other !== t) {
        console.error(styleText('red', `Error - '${kv}' found in multiple trees: ${other} and ${t}.`));
        console.error('  ' + styleText('yellow', filepath));
        process.exit(1);
      } else {
        seenkv[kv] = t;
      }

      // check and merge each item
      const seenName: Record<string, boolean> = {};
      const items = input.items || [];
      for (const item of items) {
        itemCount++;

        if (item.templateSource) {    // It's a template item
          cache.path[tkv].templates.push(item);
          continue;
        }

        // check displayName for uniqueness within this category
        if (seenName[item.displayName]) {
          console.error(styleText('red', `Error - duplicate displayName '${item.displayName}' in:`));
          console.error('  ' + styleText('yellow', filepath));
          process.exit(1);
        } else {
          seenName[item.displayName] = true;
        }

        // check locationSet
        let locationID;
        try {
// validating the locationset is fast
          const valid = loco.validateLocationSet(item.locationSet);
          locationID = valid.id;
// full resolution is slow, only necessary to see whether it returns an actual usable geojson
//          const resolved = loco.resolveLocationSet(item.locationSet);
//          locationID = resolved.id;
//          if (!resolved.feature.geometry.coordinates.length || !resolved.feature.properties.area) {
//            throw new Error(`locationSet ${locationID} resolves to an empty feature.`);
//          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(styleText('red', `Error - ${message} in:`));
          console.error('  ' + styleText('yellow', item.displayName));
          console.error('  ' + styleText('yellow', filepath));
          process.exit(1);
        }

        // check tags
        item.tags[k] = v;    // sanity check: `k=v` must exist as a tag.

        // generate id
        item.id = idgen(item, tkv, locationID);
        if (!item.id) {
          console.error(styleText('red', `Error - Couldn't generate an id for:`));
          console.error('  ' + styleText('yellow', item.displayName));
          console.error('  ' + styleText('yellow', filepath));
          process.exit(1);
        }

        // merge into caches
        if (cache.id.has(item.id)) {
          console.error(styleText('red', `Error - Duplicate id '${item.id}' in:`));
          console.error('  ' + styleText('yellow', item.displayName));
          console.error('  ' + styleText('yellow', filepath));
          process.exit(1);
        } else {
          cache.path[tkv].items.push(item);
          cache.id.set(item.id, item);
        }
      }
    }

    console.log(`${tree.emoji}  ${t}:\tLoaded ${itemCount} items in ${fileCount} files`);
  }

  return cache;
},


/**
 * Writes all cached category data back to `./data/` as pretty-printed JSON files.
 * Sorts and cleans keys, tag values, matchNames, matchTags, and category
 * properties before writing.
 *
 * @param   cache - The cache to write (expects `cache.path` to be populated)
 * @throws  Terminates via `process.exit(1)` on file-write errors.
 */
write: async (cache: NsiCache) => {
  cache = cache || {};
  cache.path = cache.path || {};

  for (const t of Object.keys(trees)) {
    const tree = trees[t];
    let itemCount = 0;
    let fileCount = 0;

    for (const tkv of Object.keys(cache.path)) {
      if (tkv.split('/')[0] !== t) continue;

      const category = cache.path[tkv];
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const v = parts[2];

      const file = `./data/${tkv}.json`;
      fileCount++;

      let templateItems = category.templates || [];
      let normalItems = category.items || [];
      if (!templateItems.length && !normalItems.length) continue;   // nothing to do

      templateItems = templateItems
        .sort((a, b) => withLocale(a.templateSource, b.templateSource))   // sort templateItems by templateSource
        .map(item => {
          // clean templateInclude/templateExclude
          if (item.templateInclude) {
            item.templateInclude = item.templateInclude.map((s: string) => s.toLowerCase()).sort(withLocale);
          }
          if (item.templateExclude) {
            item.templateExclude = item.templateExclude.map((s: string) => s.toLowerCase()).sort(withLocale);
          }

          // clean templateSource
          item.templateSource = _clean(item.templateSource);

          // clean templateTags
          const cleaned: Record<string, unknown> = {};
          for (const k of Object.keys(item.templateTags)) {
            const osmkey = _clean(k) as string;
            const osmval = _clean(item.templateTags[k]);
            cleaned[osmkey] = osmval;
          }
          item.templateTags = sortObject(cleaned);

          return sortObject(item);
        });

      normalItems = normalItems
        .filter(item => !item.fromTemplate)
        .sort((a, b) => withLocale(a.displayName, b.displayName))   // sort normalItems by displayName
        .map(item => {
          // clean displayName
          item.displayName = _clean(item.displayName);

          // clean locationSet
          let cleaned: Record<string, any> = {};
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
          for (const prop of ['matchNames', 'matchTags']) {
            if (item[prop]) {
              item[prop] = item[prop].map(_cleanLower).sort(withLocale);
            }
          }

          // clean OSM tags
          cleaned = {};
          for (const k of Object.keys(item.tags)) {
            const osmkey = _clean(k) as string;
            const osmval = _clean(item.tags[k]);
            cleaned[osmkey] = osmval;
          }
          item.tags = sortObject(cleaned);

          return sortObject(item);
        });

      // clean category properties
      const properties = category.properties || {};
      properties.exclude = properties.exclude || {};

      const cleanedProps: Record<string, any> = {};
      cleanedProps.path = tkv;

      if (properties.skipCollection) {
        cleanedProps.skipCollection = properties.skipCollection;
      }
      if (Array.isArray(properties.preserveTags)) {
        cleanedProps.preserveTags = (properties.preserveTags.map(_cleanLower) as string[]).sort(withLocale);
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

      itemCount += output.items.length;

      try {
        await Bun.write(file, stringify(output, { maxLength: 50 }) + '\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(styleText('red', `Error - ${message} writing:`));
        console.error('  ' + styleText('yellow', file));
        process.exit(1);
      }
    }

    console.log(`${tree.emoji}  ${t}:\tWrote ${itemCount} items in ${fileCount} files`);
  }


  /**
   * Trims whitespace from a value if it is a string; returns non-strings unchanged.
   *
   * @param   s - The value to clean
   * @returns The trimmed string, or the original value if not a string
   */
  function _clean(s: string | unknown): string | unknown {
    if (typeof s !== 'string') return s;
    return s.trim();
  }

  /**
   * Trims and lowercases a string value.  Skips lowercasing strings that
   * contain `İ` (Turkish capital I with dot) to avoid locale-dependent mutation (#8261).
   *
   * @param   s - The value to clean
   * @returns The trimmed (and possibly lowercased) string, or the original value
   *          if not a string
   */
  function _cleanLower(s: string | unknown): string | unknown {
    if (typeof s !== 'string') return s;
    if (/İ/.test(s)) {  // Avoid toLowerCasing this one, it changes - #8261
      return s.trim();
    } else {
      return s.trim().toLowerCase();
    }
  }
},


/**
 * Expands template items in each category into concrete items by cloning
 * source items, replacing tag tokens, and generating new ids.
 *
 * Template items reference a `templateSource` path and optionally filter
 * source items via `templateInclude` / `templateExclude` regex patterns.
 * Tag values may contain `{source.tags.xxx}` tokens that are resolved
 * against the source item.
 *
 * @param   cache - The cache (must already be populated by {@link fileTree.read})
 * @param   loco  - A `LocationConflation` instance for id generation
 * @returns The cache with template items expanded into `cache.path[tkv].items`
 * @throws  Terminates via `process.exit(1)` if a template references an invalid
 *          source path or if an id cannot be generated.
 */
expandTemplates: (cache: NsiCache, loco: LocationConflation) => {
  cache = cache || {};
  cache.id = cache.id || new Map();
  cache.path = cache.path || {};

  for (const tkv of Object.keys(cache.path)) {
    const file = `./data/${tkv}.json`;
    const templateItems = cache.path[tkv].templates || [];

    // expand each template item into real items..
    for (const templateItem of templateItems) {
      const includePatterns: RegExp[] = (templateItem.templateInclude || []).map((s: string) => new RegExp(s, 'i'));
      const excludePatterns: RegExp[] = (templateItem.templateExclude || []).map((s: string) => new RegExp(s, 'i'));
      const templateSource = templateItem.templateSource;
      const templateTags = templateItem.templateTags;

      const sourceItems = cache.path[templateSource].items;
      if (!Array.isArray(sourceItems)) {
        console.error(styleText('red', `Error - template item references invalid source path '${templateSource}' in:`));
        console.error('  ' + styleText('yellow', file));
        process.exit(1);
      }

      for (const sourceItem of sourceItems) {
        if (includePatterns.length) {
          if (!includePatterns.some(pattern => pattern.test(sourceItem.id))) continue;
        }
        if (excludePatterns.length) {
          if (excludePatterns.some(pattern => pattern.test(sourceItem.id))) continue;
        }

        const item = structuredClone(sourceItem);
        delete item.matchTags;     // don't copy matchTags (but do copy matchNames)
        item.fromTemplate = true;

        // replace tags
        const tags = item.tags;
        for (const osmkey of Object.keys(templateTags)) {
          let tagValue = templateTags[osmkey];

          if (tagValue) {
            tagValue = tagValue.replace(/{(\S+)}/g, (match: string, token: string) => {
              // token should contain something like 'source.tags.brand'
              let replacement = '';
              const props = token.split('.');
              props.shift();   // Ignore first 'source'. It's just for show.

              let source = sourceItem;
              while (props.length) {
                const prop = props.shift()!;
                const found = source[prop];
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
            // remove any related multilingual keys - #10378
            const multilingual_keys = ['name', 'alt_name', 'official_name', 'short_name', 'full_name'];
            if (multilingual_keys.includes(osmkey)) {
              for (const key of Object.keys(tags)) {
                if (key.startsWith(osmkey + ':')) {
                  delete tags[key];
                }
              }
            }
          }
        }

        // generate id
        const locationID = loco.validateLocationSet(item.locationSet).id;
        item.id = idgen(item, tkv, locationID);
        if (!item.id) {
          console.error(styleText('red', `Error - Couldn't generate an id for:`));
          console.error('  ' + styleText('yellow', item.displayName));
          console.error('  ' + styleText('yellow', file));
          process.exit(1);
        }

        // merge into caches
        if (cache.id.has(item.id)) {
          // Note - in case of duplicates, it's ok to fail silently.
          // It's allowed to copy multiple source categories into a single
          // destination category, and there may be duplicates when we do this.
          // For example `route/railway` and `route/tracks` for #8124
        } else {
          cache.path[tkv].items.push(item);
          cache.id.set(item.id, item);
        }
      }

    }
  }

  return cache;
}

};
