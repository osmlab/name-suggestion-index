import whichPolygon from 'which-polygon';
import { simplify } from './simplify.ts';

import type LocationConflation from '@rapideditor/location-conflation';
import type { FeatureProperties, Vec2 } from '@rapideditor/location-conflation';
import type { MatchHit, MatchIndexBranch, NsiData, NsiTree } from './types.ts';
import type { Feature, Geometry } from 'geojson';

// Imported JSON (will be inlined when generating a bundle)
import matchGroupsJSON from '../config/matchGroups.json' with {type: 'json'};
import genericWordsJSON from '../config/genericWords.json' with {type: 'json'};
import treesJSON from '../config/trees.json' with {type: 'json'};

/** Match-group definitions keyed by group name. */
const matchGroups = matchGroupsJSON.matchGroups;

/** Tree configuration keyed by tree name (e.g. `brands`, `operators`). */
const trees = treesJSON.trees;


/**
 * Matches OpenStreetMap `[key, value, name]` tuples against the
 * Name Suggestion Index (NSI) canonical items.
 *
 * Typical usage:
 * ```ts
 * const matcher = new Matcher();
 * matcher.buildMatchIndex(data);
 * matcher.buildLocationIndex(data, loco);   // optional
 * const hits = matcher.match('amenity', 'bank', 'Wells Fargo', [-122.4, 37.8]);
 * ```
 */
export class Matcher {
  /** Primary match index: `kv → { primary, alternate, excludeGeneric, excludeNamed }`. */
  private matchIndex: Map<string, MatchIndexBranch> | undefined;
  /** Map of generic-word pattern strings to compiled RegExp objects. */
  private genericWords = new Map<string, RegExp>();
  /** Map of item IDs to their resolved locationSet IDs. */
  public itemLocation: Map<string, string> | undefined;
  /** Map of locationSet IDs to resolved GeoJSON features. */
  public locationSets: Map<string, Feature<Geometry, FeatureProperties>> | undefined;
  /** A `which-polygon` spatial index over resolved locationSet features. */
  public locationIndex: whichPolygon.Query<FeatureProperties> | undefined;
  /** Warnings collected during index building (e.g. duplicate cache keys). */
  private warnings: Array<string> = [];


  /**
   * Creates a new Matcher and initialises the generic-word regex table
   * from `config/genericWords.json`.
   */
  constructor() {
    // The `matchIndex` is a specialized structure that allows us to quickly answer
    //   _"Given a [key/value tagpair, name, location], what canonical items (brands etc) can match it?"_
    //
    // The index contains all valid combinations of k/v tagpairs and names
    // matchIndex:
    // {
    //   'k/v': {
    //     'primary':         Map (String 'nsimple' -> Set (itemIDs…),   // matches for tags like `name`, `name:xx`, etc.
    //     'alternate':       Map (String 'nsimple' -> Set (itemIDs…),   // matches for tags like `alt_name`, `brand`, etc.
    //     'excludeNamed':    Map (String 'pattern' -> RegExp),
    //     'excludeGeneric':  Map (String 'pattern' -> RegExp)
    //   },
    // }
    //
    // {
    //   'amenity/bank': {
    //     'primary': {
    //       'firstbank':              Set ("firstbank-978cca", "firstbank-9794e6", "firstbank-f17495", …),
    //       …
    //     },
    //     'alternate': {
    //       '1stbank':                Set ("firstbank-f17495"),
    //       …
    //     }
    //   },
    //   'shop/supermarket': {
    //     'primary': {
    //       'coop':                   Set ("coop-76454b", "coop-ebf2d9", "coop-36e991", …),
    //       'coopfood':               Set ("coopfood-a8278b", …),
    //       …
    //     },
    //     'alternate': {
    //       'coop':                   Set ("coopfood-a8278b", …),
    //       'federatedcooperatives':  Set ("coop-76454b", …),
    //       'thecooperative':         Set ("coopfood-a8278b", …),
    //       …
    //     }
    //   }
    // }
    //
    this.matchIndex = undefined;

    // The `genericWords` structure matches the contents of genericWords.json to instantiated RegExp objects
    // Map (String 'pattern' -> RegExp),
    this.genericWords = new Map();
    for (const s of (genericWordsJSON.genericWords || [])) {
      this.genericWords.set(s, new RegExp(s, 'i'));
    }

    // The `itemLocation` structure maps itemIDs to locationSetIDs:
    // {
    //   'firstbank-f17495':  '+[first_bank_western_us.geojson]',
    //   'firstbank-978cca':  '+[first_bank_carolinas.geojson]',
    //   'coop-76454b':       '+[Q16]',
    //   'coopfood-a8278b':   '+[Q23666]',
    //   …
    // }
    this.itemLocation = undefined;

    // The `locationSets` structure maps locationSetIDs to *resolved* locationSets:
    // {
    //   '+[first_bank_western_us.geojson]':  GeoJSON {…},
    //   '+[first_bank_carolinas.geojson]':   GeoJSON {…},
    //   '+[Q16]':                            GeoJSON {…},
    //   '+[Q23666]':                         GeoJSON {…},
    //   …
    // }
    this.locationSets = undefined;

    // The `locationIndex` is an instance of which-polygon spatial index for the locationSets.
    this.locationIndex = undefined;

    // Array of match conflict pairs (currently unused)
    this.warnings = [];
  }


  /**
   * Builds the primary match index from NSI category data.
   * After calling this method the matcher is ready to use via {@link match}.
   *
   * `data` must be an object keyed by `tree/key/value` paths, e.g.:
   * ```json
   * {
   *   "brands/amenity/bank": { "properties": {}, "items": [ … ] },
   *   "brands/amenity/bar":  { "properties": {}, "items": [ … ] }
   * }
   * ```
   * (typically the cache built by `fileTree.read` or loaded from `dist/nsi.json`)
   *
   * @param data - NSI category data indexed by `tree/key/value` path
   */
  buildMatchIndex(data: NsiData): void {
    if (this.matchIndex) return;   // it was built already

    const matchIndex = new Map<string, MatchIndexBranch>();
    this.matchIndex = matchIndex;

    const seenTree = new Map();  // warn if the same [k, v, nsimple] appears in multiple trees - #5625

    // For certain categories we do not want to match generic KV pairs like `building/yes` or `amenity/yes`
    const skipGenericKVMatches = (t: string, k: string, v: string): boolean => {
      return (
        t === 'flags' ||
        t === 'transit' ||
        k === 'landuse' ||
        v === 'atm' ||
        v === 'bicycle_parking' ||
        v === 'car_sharing' ||
        v === 'caravan_site' ||
        v === 'charging_station' ||
        v === 'dog_park' ||
        v === 'parking' ||
        v === 'phone' ||
        v === 'playground' ||
        v === 'post_box' ||
        v === 'public_bookcase' ||
        v === 'recycling' ||
        v === 'vending_machine'
      );
    };

    // Insert this item into the matchIndex
    const insertName = (which: 'primary' | 'alternate', t: string, kv: string, nsimple: string, itemID: string) => {
      if (!nsimple) {
        this.warnings.push(`Warning: skipping empty ${which} name for item ${t}/${kv}: ${itemID}`);
        return;
      }

      let branch = matchIndex.get(kv);
      if (!branch) {
        branch = {
          primary: new Map(),
          alternate: new Map(),
          excludeGeneric: new Map(),
          excludeNamed: new Map()
        };
        matchIndex.set(kv, branch);
      }

      let leaf = branch[which].get(nsimple);
      if (!leaf) {
        leaf = new Set();
        branch[which].set(nsimple, leaf);
      }

      leaf.add(itemID);   // insert

      // check for duplicates - #5625
      if (!/yes$/.test(kv)) {  // ignore genericKV like amenity/yes, building/yes, etc
        const kvnsimple = `${kv}/${nsimple}`;
        const existing = seenTree.get(kvnsimple);
        if (existing && existing !== t) {
          const items = Array.from(leaf);
          this.warnings.push(`Duplicate cache key "${kvnsimple}" in trees "${t}" and "${existing}", check items: ${items}`);
          return;
        }
        seenTree.set(kvnsimple, t);
      }
    };

    for (const tkv of Object.keys(data)) {
      const category = data[tkv];
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const t = parts[0] as NsiTree;
      const k = parts[1];
      const v = parts[2];
      const thiskv = `${k}/${v}`;
      const tree = trees[t];

      let branch = matchIndex.get(thiskv);
      if (!branch) {
        branch = {
          primary: new Map(),
          alternate: new Map(),
          excludeGeneric: new Map(),
          excludeNamed: new Map()
        };
        matchIndex.set(thiskv, branch);
      }

      // ADD EXCLUSIONS
      const properties = category.properties || {};
      const exclude = properties.exclude || {};
      for (const s of (exclude.generic || [])) branch.excludeGeneric.set(s, new RegExp(s, 'i'));
      for (const s of (exclude.named || []))   branch.excludeNamed.set(s, new RegExp(s, 'i'));
      const excludeRegexes = [...branch.excludeGeneric.values(), ...branch.excludeNamed.values()];


      // ADD ITEMS
      const items = category.items;
      if (!Array.isArray(items) || !items.length) continue;


      // Primary name patterns, match tags to take first
      //  e.g. `name`, `name:ru`
      const primaryName = new RegExp(tree.nameTags.primary, 'i');

      // Alternate name patterns, match tags to consider after primary
      //  e.g. `alt_name`, `short_name`, `brand`, `brand:ru`, etc..
      const alternateName = new RegExp(tree.nameTags.alternate, 'i');

      // There are a few exceptions to the name matching regexes.
      // Usually a tag suffix contains a language code like `name:en`, `name:ru`
      // but we want to exclude things like `operator:type`, `name:etymology`, etc..
      const notName = /:(colou?r|type|forward|backward|left|right|etymology|pronunciation|signed|wikipedia)$/i;

      // For certain categories we do not want to match generic KV pairs like `building/yes` or `amenity/yes`
      const skipGenericKV = skipGenericKVMatches(t, k, v);

      // We will collect the generic KV pairs anyway (for the purpose of filtering them out of matchTags)
      const genericKV = new Set([`${k}/yes`, `building/yes`]);

      // Collect alternate tagpairs for this kv category from matchGroups.
      // We might also pick up a few more generic KVs (like `shop/yes`)
      const matchGroupKV = new Set();
      for (const matchGroup of Object.values(matchGroups)) {
        const inGroup = matchGroup.some(otherkv => otherkv === thiskv);
        if (!inGroup) continue;

        for (const otherkv of matchGroup) {
          if (otherkv === thiskv) continue;   // skip self
          matchGroupKV.add(otherkv);

          const otherk = otherkv.split('/', 2)[0];   // we might pick up a `shop/yes`
          genericKV.add(`${otherk}/yes`);
        }
      }

      // For each item, insert all [key, value, name] combinations into the match index
      for (const item of items) {
        if (!item.id) continue;

        // Automatically remove redundant `matchTags` - #3417, #8137
        // (i.e. This kv is already covered by matchGroups, so it doesn't need to be in `item.matchTags`
        //  or this kv is the primary kv, so it doesn't need to be duplicated in `item.matchTags`)
        if (Array.isArray(item.matchTags) && item.matchTags.length) {
          item.matchTags = item.matchTags
            .filter(matchTag => !matchGroupKV.has(matchTag) && (matchTag !== thiskv) && !genericKV.has(matchTag));

          if (!item.matchTags.length) delete item.matchTags;
        }

        // key/value tagpairs to insert into the match index..
        let kvTags = [`${thiskv}`]
          .concat(item.matchTags || []);

        if (!skipGenericKV) {
          kvTags = kvTags
            .concat(Array.from(genericKV));  // #3454 - match some generic tags
        }

        // Index all the namelike tag values
        for (const osmkey of Object.keys(item.tags)) {
          if (notName.test(osmkey)) continue;   // osmkey is not a namelike tag, skip
          const osmvalue = item.tags[osmkey];
          if (!osmvalue || excludeRegexes.some(regex => regex.test(osmvalue))) continue;   // osmvalue missing or excluded

          if (primaryName.test(osmkey)) {
            for (const kv of kvTags) insertName('primary', t, kv, simplify(osmvalue), item.id);
          } else if (alternateName.test(osmkey)) {
            for (const kv of kvTags) insertName('alternate', t, kv, simplify(osmvalue), item.id);
          }
        }

        // Index `matchNames` after indexing all other names..
        const keepMatchNames = new Set<string>();
        for (const matchName of (item.matchNames || [])) {
          // If this matchname isn't already indexed, add it to the alternate index
          const nsimple = simplify(matchName);
          for (const kv of kvTags) {
            const branch = matchIndex.get(kv);
            const primaryLeaf = branch && branch.primary.get(nsimple);
            const alternateLeaf = branch && branch.alternate.get(nsimple);
            const inPrimary = primaryLeaf && primaryLeaf.has(item.id);
            const inAlternate = alternateLeaf && alternateLeaf.has(item.id);

            if (!inPrimary && !inAlternate) {
              insertName('alternate', t, kv, nsimple, item.id);
              keepMatchNames.add(matchName);
            }
          }
        }

        // Automatically remove redundant `matchNames` - #3417
        // (i.e. This name got indexed some other way, so it doesn't need to be in `item.matchNames`)
        if (keepMatchNames.size) {
          item.matchNames = Array.from(keepMatchNames);
        } else {
          delete item.matchNames;
        }

      }   // each item
    }   // each tkv
  }


  /**
   * Builds a `which-polygon` spatial index by resolving every item's
   * locationSet into GeoJSON.  This is optional — skip it if you don't
   * need location-aware matching.  Resolution can be slow for large datasets.
   *
   * `data` must be an object keyed by `tree/key/value` paths (same format as
   * {@link buildMatchIndex}).
   *
   * @param data - NSI category data indexed by `tree/key/value` path
   * @param loco - A `LocationConflation` instance used to resolve locationSets
   */
  buildLocationIndex(data: NsiData, loco: LocationConflation): void {
    if (this.locationIndex) return;   // it was built already

    this.itemLocation = new Map();
    this.locationSets = new Map();

    for (const tkv of Object.keys(data)) {
      const items = data[tkv].items;
      if (!Array.isArray(items) || !items.length) continue;

      for (const item of items) {
        if (this.itemLocation.has(item.id)) continue;   // we've seen item id already - shouldn't be possible?

        let resolved;
        try {
          resolved = loco.resolveLocationSet(item.locationSet);   // resolve a feature for this locationSet
        } catch (err: unknown) {
          const message = (err instanceof Error) ? err.message : err;
          console.warn(`buildLocationIndex: ${message}`);     // couldn't resolve
        }
        if (!resolved || !resolved.id) continue;

        this.itemLocation.set(item.id, resolved.id);      // link it to the item
        if (this.locationSets.has(resolved.id)) continue;   // we've seen this locationSet feature before..

        // First time seeing this locationSet feature, make a copy and add to locationSet cache..
        const feature = structuredClone(resolved.feature);
        feature.id = resolved.id;      // Important: always use the locationSet `id` (`+[Q30]`), not the feature `id` (`Q30`)
        feature.properties.id = resolved.id;

        if (!feature.geometry.coordinates.length || !feature.properties.area) {
          console.warn(`buildLocationIndex: locationSet ${resolved.id} for ${item.id} resolves to an empty feature:`);
          console.warn(JSON.stringify(feature));
          continue;
        }

        this.locationSets.set(resolved.id, feature);
      }
    }

    this.locationIndex = whichPolygon({ type: 'FeatureCollection', features: [...this.locationSets.values()] });
  }


  /**
   * Matches a `[key, value, name]` tuple against the index and returns results.
   *
   * **Case 1 — canonical match:**
   * Returns an array of {@link Hit} objects sorted by match quality:
   *   - `"primary"` hits (matches `name` tag) come first,
   *   - `"alternate"` hits (matches `alt_name`, `brand`, etc.) come second.
   *
   * Within each group, results are sorted by area:
   *   - **area descending** (worldwide → local) when no `loc` is given,
   *   - **area ascending** (local → worldwide) when `loc` is given.
   *
   * Each hit includes the item's `area` in km².
   *
   * **Case 2 — exclude match:**
   * Returns a single-element array with either:
   *   - `{ match: 'excludeGeneric', pattern, kv }` — a generic word (e.g. "Food Court")
   *     that is probably not a real name.
   *   - `{ match: 'excludeNamed', pattern, kv }` — a real but common name (e.g. "Kebabai")
   *     that is not a brand.
   *
   * **Case 3 — no match:**
   * Returns `null`.
   *
   * @param   k   - OSM key (e.g. `"amenity"`)
   * @param   v   - OSM value (e.g. `"bank"`)
   * @param   n   - A name-like string to look up (e.g. `"Wells Fargo"`)
   * @param   loc - Optional `[lon, lat]` coordinate to restrict results by location
   * @returns An array of {@link Hit} results, or `null` if nothing matched.
   * @throws  {Error} If the match index has not been built yet.
   */
  match(k: string, v: string, n: string, loc?: Vec2): Array<MatchHit> | null {
    if (!this.matchIndex) {
      throw new Error('match:  matchIndex not built.');
    }
    const matchIndex = this.matchIndex;

    // If we were supplied a location, and this.locationIndex has been set up,
    // get the locationSets that are valid there so we can filter results.
    let matchLocations: FeatureProperties[] | null;
    if (Array.isArray(loc) && this.locationIndex) {
      // which-polygon query returns an array of GeoJSON properties, pass true to return all results
      matchLocations = this.locationIndex([loc[0], loc[1]], true);
    }

    const nsimple = simplify(n);

    const seen = new Set();
    const results: Array<MatchHit> = [];

    // Sort smaller (more local) locations first.
    const byAreaAscending = (hitA: MatchHit, hitB: MatchHit): number => {
      return (hitA.area || 0) - (hitB.area || 0);
    };
    // Sort larger (more worldwide) locations first.
    const byAreaDescending = (hitA: MatchHit, hitB: MatchHit): number => {
      return (hitB.area || 0) - (hitA.area || 0);
    };

    const isValidLocation = (hit: MatchHit) => {
      if (!this.itemLocation) return true;
      return matchLocations?.some(props => props.id === this.itemLocation!.get(hit.itemID!));
    };

    const tryMatch = (which: 'primary' | 'alternate' | 'exclude', kv: string): boolean => {
      const branch = matchIndex.get(kv);
      if (!branch) return false;

      if (which === 'exclude') {  // Test name `n` against named and generic exclude patterns
        let regex = [...branch.excludeNamed.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeNamed', pattern: String(regex), kv: kv });
          return false;
        }
        regex = [...branch.excludeGeneric.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeGeneric', pattern: String(regex), kv: kv });
          return false;
        }
        return false;
      }

      const leaf = branch[which].get(nsimple);
      if (!leaf || !leaf.size) return false;
      if (!(which === 'primary' || which === 'alternate')) return false;

      // If we get here, we matched something..
      // Prepare the results, calculate areas (if location index was set up)
      let hits: Array<MatchHit> = [];
      for (const itemID of [...leaf]) {
        let area = Infinity;
        if (this.itemLocation && this.locationSets) {
          const location = this.locationSets.get(this.itemLocation.get(itemID)!);
          area = (location && location.properties.area) || Infinity;
        }
        hits.push({ match: which, itemID: itemID, area: area, kv: kv, nsimple: nsimple });
      }

      let sortFn = byAreaDescending;

      // Filter the match to include only results valid in the requested `loc`..
      if (matchLocations) {
        hits = hits.filter(isValidLocation);
        sortFn = byAreaAscending;
      }

      if (!hits.length) return false;

      // push results
      for (const hit of hits.sort(sortFn)) {
        if (seen.has(hit.itemID)) continue;
        seen.add(hit.itemID);
        results.push(hit);
      }

      return true;
    };

    const gatherResults = (which: 'primary' | 'alternate' | 'exclude'): void => {
      // First try an exact match on k/v
      const kv = `${k}/${v}`;
      let didMatch = tryMatch(which, kv);
      if (didMatch) return;

      // If that didn't work, look in match groups for other pairs considered equivalent to k/v..
      for (const matchGroup of Object.values(matchGroups)) {
        const inGroup = matchGroup.some(otherkv => otherkv === kv);
        if (!inGroup) continue;

        for (const otherkv of matchGroup) {
          if (otherkv === kv) continue;  // skip self
          didMatch = tryMatch(which, otherkv);
          if (didMatch) return;
        }
      }

      // If finished 'exclude' pass and still haven't matched anything, try the global `genericWords.json` patterns
      if (which === 'exclude') {
        const regex = [...this.genericWords.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeGeneric', pattern: String(regex) });  // note no `branch`, no `kv`
          return;
        }
      }
    };

    gatherResults('primary');
    gatherResults('alternate');
    if (results.length) return results;

    gatherResults('exclude');
    return results.length ? results : null;
  }


  /**
   * Returns any warnings discovered while building the match index
   * (e.g. duplicate cache keys across trees).
   *
   * @returns An array of warning message strings (may be empty).
   */
  getWarnings(): Array<string> {
    return this.warnings;
  }
}
