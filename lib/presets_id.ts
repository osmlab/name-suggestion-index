import { sortObject } from './sort_object.ts';

import type {
  DissolvedMap,
  NsiData,
  NsiPath,
  NsiTree,
  NsiTreeProperties,
  OsmTags,
  IDPreset,
  WikidataMap
} from './types.ts';

const withLocale = new Intl.Collator('en-US').compare;  // specify 'en-US' for stable sorting

// Imported JSON (will be inlined by bun)
import treesJSON from '../config/trees.json' with {type: 'json'};
const trees: Record<NsiTree, NsiTreeProperties> = treesJSON.trees;


/** Options for {@link buildIDPresets}. */
export interface BuildIDPresetsOptions {
  /** The id-tagging-schema source presets dictionary (the `presets` field of `presets.json`). */
  sourcePresets: Record<string, IDPreset>;
  /** Map of QID → wikidata info, used to source preset `imageURL` values. */
  wikidata?: WikidataMap;
  /** Map of NSI item id → dissolved record. Items present here become non-searchable. */
  dissolved?: DissolvedMap;
}

/** Result of {@link buildIDPresets}. */
export interface BuildIDPresetsResult {
  /** The generated iD/Rapid presets, keyed by `<presetID>/<itemID>`. */
  presets: Record<string, IDPreset>;
  /** Sorted list of NSI `tree/key/value` paths for which no source iD preset was found. */
  missing: NsiPath[];
}


/**
 * Build iD/Rapid presets from NSI data.
 *
 * This is a pure function: it does no I/O, performs no console output, and does not
 * mutate any of its inputs. Suitable for use in browser-based downstream projects
 * that fetch the NSI data on-the-fly.
 *
 * @param data - NSI category data indexed by `tree/key/value` path (the `_nsi.path` cache, or `nsi.json`'s `nsi` field)
 * @param opts - Sources for id-tagging-schema presets, wikidata logos, and dissolutions
 * @returns the generated presets plus a list of paths missing a source iD preset
 */
export function buildIDPresets(data: NsiData, opts: BuildIDPresetsOptions): BuildIDPresetsResult {
  const sourcePresets = opts.sourcePresets;
  const wikidata = opts.wikidata || {};
  const dissolved = opts.dissolved || {};

  //
  // First we'll match every NSI item to a source iD preset.
  // The source iD presets look like this:
  //
  // "amenity": {
  //   "name": "Amenity"
  //   "fields": […],
  //   "geometry": […],
  //   "tags": {
  //     "amenity": "*"
  //   },
  //   "searchable": false
  // },
  // "amenity/fast_food": {
  //   "name": "Fast Food",
  //   "icon": "maki-fast-food",
  //   "fields": […],
  //   "geometry": […],
  //   "terms": […],
  //   "tags": {
  //     "amenity": "fast_food"
  //   }
  // },
  // "amenity/fast_food/sandwich": {
  //   "name": "Sandwich Fast Food",
  //   "icon": "temaki-sandwich",
  //   "fields": […],
  //   "geometry": […],
  //   "terms": […],
  //   "tags": {
  //     "amenity": "fast_food",
  //     "cuisine": "sandwich"
  //   }
  // },
  //
  // There are a few special behaviors in the iD presets are important to us:
  // - They each have stable identifiers like `key`, `key/value`, `key/value/anothervalue`
  // - Presets with increasing specificity "inherit" fields from presets of less specificity
  //    (e.g. the sandwich fast food preset inherits all the fields of the regular fast food preset)
  // - We can generate presets with NSI identifiers that hang off the end of this specificity chain
  //    (e.g. "amenity/fast_food/sandwich/arbys-3c08fb")
  // - NSI identifiers will not collide with the preset identifiers (NSI ids don't look like tag values)
  //

  const targetPresets: Record<string, IDPreset> = {};
  const missing = new Set<string>();
  const paths = Object.keys(data);

  // Ferry hack! ⛴
  // Append a duplicate tkv path for Ferry routes so we can generate them twice..
  // These actually exist as 2 iD presets:
  // `type/route/ferry` - for a Route Relation
  // `route/ferry` - for a Way
  let ferryCount = 0;
  if (data['transit/route/ferry']) {
    paths.push('transit/route/ferry');   // add a duplicate tkv
  }

  for (const tkv of paths.sort(withLocale) as NsiPath[]) {
    const properties = data[tkv].properties || {};
    const items = data[tkv].items;
    if (!Array.isArray(items) || !items.length) continue;

    const [t, k, v] = tkv.split('/', 3);   // tkv = "tree/key/value"
    const tree = trees[t as NsiTree];
    const kv = `${k}/${v}`;

    let presetPath = kv;

    // Exceptions where the NSI `key/value` doesn't match the iD preset path `key/value`
    // See also https://github.com/openstreetmap/iD/issues/11527
    // id-tagging-schema occasionally moves their presets around, changing their presetIDs.
    if (k === 'route')                     presetPath = `type/route/${v}`;   // Route Relation
    if (kv === 'highway/bus_stop')         presetPath = 'public_transport/platform/bus_point';
    if (kv === 'amenity/ferry_terminal')   presetPath = 'public_transport/station_ferry';
    if (kv === 'amenity/college')          presetPath = 'education/college';
    if (kv === 'amenity/driving_school')   presetPath = 'education/driving_school';
    if (kv === 'amenity/dancing_school')   presetPath = 'education/dancing_school';
    if (kv === 'amenity/kindergarten')     presetPath = 'education/kindergarten';
    if (kv === 'amenity/language_school')  presetPath = 'education/language_school';
    if (kv === 'amenity/music_school')     presetPath = 'education/music_school';
    if (kv === 'amenity/prep_school')      presetPath = 'education/prep_school';
    if (kv === 'amenity/school')           presetPath = 'education/school';
    if (kv === 'amenity/university')       presetPath = 'education/university';
    if (kv === 'emergency/water_rescue')   presetPath = 'emergency/lifeboat_station';

    // Ferry hack! ⛴
    if (tkv === 'transit/route/ferry') {
      if (!ferryCount++) {
        presetPath = 'type/route/ferry';  // Route Relation
      } else {
        presetPath = 'route/ferry';  // Way
      }
    }

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = tree.mainTag;

    // Primary/alternate names may be used as preset search terms
    const primaryName = new RegExp(tree.nameTags.primary, 'i');
    const alternateName = new RegExp(tree.nameTags.alternate, 'i');

    // There are a few exceptions to the name matching regexes.
    // Usually a tag suffix contains a language code like `name:en`, `name:ru`
    // but we want to exclude things like `operator:type`, `name:etymology`, etc..
    // NOTE: here we intentionally exclude `:wikidata`, in `matcher.ts` we do not.
    const notName = /:(colour|type|left|right|etymology|pronunciation|wikipedia|wikidata)$/i;

    // Look for iD presets that would fit this NSI presetPath.
    const childPresets = new Map<string, IDPreset>();
    for (const checkPath in sourcePresets) {
      if (checkPath.startsWith(presetPath)) {
        childPresets.set(checkPath, sourcePresets[checkPath]);
      }
    }

    for (const item of items) {
      const tags = item.tags;
      const qid = tags[wdTag];
      if (!qid || !/^Q\d+$/.test(qid)) continue;   // wikidata tag missing or looks wrong..

      let presetID: string | undefined;
      let preset: IDPreset | undefined;

      // Sometimes we can choose a more specific iD preset then `key/value`..
      // Attempt to match a `key/value/extravalue`
      if (childPresets.size > 1) {
        // The best iD preset for an NSI entry is determined by count of tags that have
        // matched (more is better) and position for multi-value tags (e.g. cuisine)
        let matchTagsCount = 0;
        let matchSemicolonRating = 0;

        let matchPresetPath;
        let matchPreset;

        for (const [checkPresetPath, checkPreset] of childPresets) {
          const checkPresetTags = Object.entries(checkPreset.tags as OsmTags);
          let currentMatchSemicolonRating = 0;

          const isPresetMatch = checkPresetTags.every(kv => {
            // Tags that NSI allows to process as multi-valued
            const semicolonSplittedKeys = ['beauty', 'clothes', 'cuisine', 'healthcare:speciality', 'social_facility', 'sport', 'vending', 'waste'];
            const osmKey = kv[0];
            const osmVal = kv[1];

            const nsiVal = tags[osmKey];
            if (!nsiVal) {
              return false;
            }
            if (semicolonSplittedKeys.includes(osmKey)) {
              const vals = nsiVal.split(';');
              const findResult = vals.indexOf(osmVal);
              if (findResult === -1) {
                return false;
              }
              // For a smaller element index rating will be higher
              currentMatchSemicolonRating -= findResult;
              return true;
            }
            return (osmVal === nsiVal);
          });

          // If rating of current element is higher than the saved one, we overwrite saved
          if (isPresetMatch && (
            (checkPresetTags.length > matchTagsCount) ||
            (checkPresetTags.length === matchTagsCount && currentMatchSemicolonRating > matchSemicolonRating)
          )) {
            matchTagsCount = checkPresetTags.length;
            matchSemicolonRating = currentMatchSemicolonRating;
            matchPresetPath = checkPresetPath;
            matchPreset = checkPreset;
          }
        }

        presetID = matchPresetPath;
        preset = matchPreset;
      }

      // fallback to the first `key/value`
      if (!preset && childPresets.size === 1) {
        const presetKV = childPresets.entries().next().value;
        if (presetKV) {
          presetID = presetKV[0];
          preset = presetKV[1];
        }
      }

      // still no match?
      // fallback to generic like `amenity/yes`, `shop/yes`
      if (!preset) {
        presetID = k;
        preset = sourcePresets[presetID];
        missing.add(tkv);
      }
      // *still* no match?
      // bail out of this category
      if (!preset) {
        continue;
      }

      // Gather search terms - include all primary/alternate names and matchNames
      // (There is similar code in lib/matcher.ts)
      const terms = new Set(item.matchNames || []);
      for (const osmkey of Object.keys(tags)) {
        if (osmkey === 'name') continue;      // exclude `name` tag, as iD prioritizes it above `preset.terms` already
        if (notName.test(osmkey)) continue;   // osmkey is not a namelike tag, skip

        if (primaryName.test(osmkey) || alternateName.test(osmkey)) {
          terms.add(tags[osmkey].toLowerCase());
        }
      }

      // generate our target preset
      const targetID = `${presetID}/${item.id}`;

      const targetTags: OsmTags = {};
      targetTags[wdTag] = tags[wdTag]; // add the `*:wikidata` tag
      for (const k in preset.tags) {     // prioritize NSI tags over iD preset tags (for `vending`, `cuisine`, etc)
        targetTags[k] = tags[k] || preset.tags[k];
      }

      // Prefer a wiki commons logo sometimes..
      // Related issues list: iD#6361, NSI#2798, NSI#3122, NSI#8042, NSI#8373
      const preferCommons: Record<string, boolean> = {
        Q177054: true,    // Burger King
        Q524757: true,    // KFC
        Q779845: true,    // CBA
        Q1205312: true,   // In-N-Out
        Q10443115: true,   // Carlings
        Q38076: true   // McDonald's
      };

      let logoURL;
      const logoURLs = wikidata[qid] && wikidata[qid].logos;
      if (logoURLs) {
        if (logoURLs.wikidata && preferCommons[qid]) {
          logoURL = logoURLs.wikidata;
        } else if (logoURLs.facebook) {
          logoURL = logoURLs.facebook;
        } else {
          logoURL = logoURLs.wikidata;
        }
      }

      // Special rule for "name" fields:
      // If we're preserving the `name` tag, make sure both "name" and "brand" fields are shown.
      // This triggers iD to lock the "brand" field but allow edits to the "name" field.
      const preserveTags = item.preserveTags || properties.preserveTags || [];
      let fields;
      if (t === 'brands' && preserveTags.some(s => s === '^name')) {
        fields = ['name', 'brand', `{${presetID}}`];
      } else if (t === 'operators' && preserveTags.some(s => s === '^name')) {
        fields = ['name', 'operator', `{${presetID}}`];
      }

      const targetPreset = {
        name:         item.displayName,
        locationSet:  item.locationSet,
        icon:         preset.icon,
        geometry:     preset.geometry,
        matchScore:   2
      } as IDPreset;

      if (logoURL)             targetPreset.imageURL = logoURL;
      if (terms.size)          targetPreset.terms = Array.from(terms).sort(withLocale);
      if (fields)              targetPreset.fields = fields;
      if (preset.reference)    targetPreset.reference = preset.reference;
      if (dissolved[item.id])  targetPreset.searchable = false;  // dissolved/closed businesses
      if (preserveTags.length) targetPreset.preserveTags = preserveTags; // see NSI#10083

      targetPreset.tags = sortObject(targetTags) as OsmTags;
      targetPreset.addTags = sortObject(Object.assign({}, item.tags, targetTags)) as OsmTags;

      targetPresets[targetID] = targetPreset;
    }
  }

  return {
    presets: targetPresets,
    missing: Array.from(missing).sort(withLocale)
  };
}
