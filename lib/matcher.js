// External
import whichPolygon from 'which-polygon';

// Internal
import { simplify } from './simplify.js';

// JSON
import matchGroupsJSON from '../config/matchGroups.json';
import genericWordsJSON from '../config/genericWords.json';
import treesJSON from '../config/trees.json';

const matchGroups = matchGroupsJSON.matchGroups;
const trees = treesJSON.trees;


export class Matcher {
  //
  // `constructor`
  // initialize the genericWords regexes
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
    (genericWordsJSON.genericWords || []).forEach(s => this.genericWords.set(s, new RegExp(s, 'i')));

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


  //
  // `buildMatchIndex()`
  // Call this to prepare the matcher for use
  //
  // `data` needs to be an Object indexed on a 'tree/key/value' path.
  // (e.g. cache filled by `fileTree.read` or data found in `dist/nsi.json`)
  // {
  //    'brands/amenity/bank': { properties: {}, items: [ {}, {}, … ] },
  //    'brands/amenity/bar':  { properties: {}, items: [ {}, {}, … ] },
  //    …
  // }
  //
  buildMatchIndex(data) {
    const that = this;
    if (that.matchIndex) return;   // it was built already
    that.matchIndex = new Map();

    Object.keys(data).forEach(tkv => {
      const category = data[tkv];
      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];
      const thiskv = `${k}/${v}`;
      const tree = trees[t];

      let branch = that.matchIndex.get(thiskv);
      if (!branch) {
        branch = {
          primary: new Map(),
          alternate: new Map(),
          excludeGeneric: new Map(),
          excludeNamed: new Map()
        };
        that.matchIndex.set(thiskv, branch);
      }

      // ADD EXCLUSIONS
      const properties = category.properties || {};
      const exclude = properties.exclude || {};
      (exclude.generic || []).forEach(s => branch.excludeGeneric.set(s, new RegExp(s, 'i')));
      (exclude.named || []).forEach(s => branch.excludeNamed.set(s, new RegExp(s, 'i')));
      const excludeRegexes = [...branch.excludeGeneric.values(), ...branch.excludeNamed.values()];


      // ADD ITEMS
      let items = category.items;
      if (!Array.isArray(items) || !items.length) return;


      // Primary name patterns, match tags to take first
      //  e.g. `name`, `name:ru`
      const primaryName = new RegExp(tree.nameTags.primary, 'i');

      // Alternate name patterns, match tags to consider after primary
      //  e.g. `alt_name`, `short_name`, `brand`, `brand:ru`, etc..
      const alternateName = new RegExp(tree.nameTags.alternate, 'i');

      // There are a few exceptions to the name matching regexes.
      // Usually a tag suffix contains a language code like `name:en`, `name:ru`
      // but we want to exclude things like `operator:type`, `name:etymology`, etc..
      const notName = /:(colou?r|type|forward|backward|left|right|etymology|pronunciation|wikipedia)$/i;

      // For certain categories we do not want to match generic KV pairs like `building/yes` or `amenity/yes`
      const skipGenericKV = skipGenericKVMatches(t, k, v);

      // We will collect the generic KV pairs anyway (for the purpose of filtering them out of matchTags)
      const genericKV = new Set([`${k}/yes`, `building/yes`]);

      // Collect alternate tagpairs for this kv category from matchGroups.
      // We might also pick up a few more generic KVs (like `shop/yes`)
      const matchGroupKV = new Set();
      Object.values(matchGroups).forEach(matchGroup => {
        const inGroup = matchGroup.some(otherkv => otherkv === thiskv);
        if (!inGroup) return;

        matchGroup.forEach(otherkv => {
          if (otherkv === thiskv) return;   // skip self
          matchGroupKV.add(otherkv);

          const otherk = otherkv.split('/', 2)[0];   // we might pick up a `shop/yes`
          genericKV.add(`${otherk}/yes`);
        });
      });

      // For each item, insert all [key, value, name] combinations into the match index
      items.forEach(item => {
        if (!item.id) return;

        // Automatically remove redundant `matchTags` - #3417
        // (i.e. This kv is already covered by matchGroups, so it doesn't need to be in `item.matchTags`)
        if (Array.isArray(item.matchTags) && item.matchTags.length) {
          item.matchTags = item.matchTags
            .filter(matchTag => !matchGroupKV.has(matchTag) && !genericKV.has(matchTag));

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
        Object.keys(item.tags).forEach(osmkey => {
          if (notName.test(osmkey)) return;   // osmkey is not a namelike tag, skip
          const osmvalue = item.tags[osmkey];
          if (!osmvalue || excludeRegexes.some(regex => regex.test(osmvalue))) return;   // osmvalue missing or excluded

          if (primaryName.test(osmkey)) {
            kvTags.forEach(kv => insertName('primary', kv, simplify(osmvalue), item.id));
          } else if (alternateName.test(osmkey)) {
            kvTags.forEach(kv => insertName('alternate', kv, simplify(osmvalue), item.id));
          }
        });

        // Index `matchNames` after indexing all other names..
        let keepMatchNames = new Set();
        (item.matchNames || []).forEach(matchName => {
          // If this matchname isn't already indexed, add it to the alternate index
          const nsimple = simplify(matchName);
          kvTags.forEach(kv => {
            const branch = that.matchIndex.get(kv);
            const primaryLeaf = branch && branch.primary.get(nsimple);
            const alternateLeaf = branch && branch.alternate.get(nsimple);
            const inPrimary = primaryLeaf && primaryLeaf.has(item.id);
            const inAlternate = alternateLeaf && alternateLeaf.has(item.id);

            if (!inPrimary && !inAlternate) {
              insertName('alternate', kv, nsimple, item.id);
              keepMatchNames.add(matchName);
            }
          });
        });

        // Automatically remove redundant `matchNames` - #3417
        // (i.e. This name got indexed some other way, so it doesn't need to be in `item.matchNames`)
        if (keepMatchNames.size) {
          item.matchNames = Array.from(keepMatchNames);
        } else {
          delete item.matchNames;
        }

      });   // each item
    });   // each tkv


    // Insert this item into the matchIndex
    function insertName(which, kv, nsimple, itemID) {
      if (!nsimple)  return;

      let branch = that.matchIndex.get(kv);
      if (!branch) {
        branch = {
          primary: new Map(),
          alternate: new Map(),
          excludeGeneric: new Map(),
          excludeNamed: new Map()
        };
        that.matchIndex.set(kv, branch);
      }

      let leaf = branch[which].get(nsimple);
      if (!leaf) {
        leaf = new Set();
        branch[which].set(nsimple, leaf);
      }

      leaf.add(itemID);   // insert
    }

    // For certain categories we do not want to match generic KV pairs like `building/yes` or `amenity/yes`
    function skipGenericKVMatches(t, k, v) {
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
    }
  }


  //
  // `buildLocationIndex()`
  // Call this to prepare a which-polygon location index.
  // This *resolves* all the locationSets into GeoJSON, which takes some time.
  // You can skip this step if you don't care about matching within a location.
  //
  // `data` needs to be an Object indexed on a 'tree/key/value' path.
  // (e.g. cache filled by `fileTree.read` or data found in `dist/nsi.json`)
  // {
  //    'brands/amenity/bank': { properties: {}, items: [ {}, {}, … ] },
  //    'brands/amenity/bar':  { properties: {}, items: [ {}, {}, … ] },
  //    …
  // }
  //
  buildLocationIndex(data, loco) {
    const that = this;
    if (that.locationIndex) return;   // it was built already

    that.itemLocation = new Map();
    that.locationSets = new Map();

    Object.keys(data).forEach(tkv => {
      const items = data[tkv].items;
      if (!Array.isArray(items) || !items.length) return;

      items.forEach(item => {
        if (that.itemLocation.has(item.id)) return;   // we've seen item id already - shouldn't be possible?

        let resolved;
        try {
          resolved = loco.resolveLocationSet(item.locationSet);   // resolve a feature for this locationSet
        } catch (err) {
          console.warn(`buildLocationIndex: ${err.message}`);     // couldn't resolve
        }
        if (!resolved || !resolved.id) return;

        that.itemLocation.set(item.id, resolved.id);      // link it to the item
        if (that.locationSets.has(resolved.id)) return;   // we've seen this locationSet feature before..

        // First time seeing this locationSet feature, make a copy and add to locationSet cache..
        let feature = _cloneDeep(resolved.feature);
        feature.id = resolved.id;      // Important: always use the locationSet `id` (`+[Q30]`), not the feature `id` (`Q30`)
        feature.properties.id = resolved.id;

        if (!feature.geometry.coordinates.length || !feature.properties.area) {
          console.warn(`buildLocationIndex: locationSet ${resolved.id} for ${item.id} resolves to an empty feature:`);
          console.warn(JSON.stringify(feature));
          return;
        }

        that.locationSets.set(resolved.id, feature);
      });
    });

    that.locationIndex = whichPolygon({ type: 'FeatureCollection', features: [...that.locationSets.values()] });

    function _cloneDeep(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  }


  //
  // `match()`
  // Pass parts and return an Array of matches.
  // `k` - key
  // `v` - value
  // `n` - namelike
  // `loc` - optional - [lon,lat] location to search
  //
  // 1. If the [k,v,n] tuple matches a canonical item…
  // Return an Array of match results.
  // Each result will include the area in km² that the item is valid.
  //
  // Order of results:
  // Primary ordering will be on the "match" column:
  //   "primary" - where the query matches the `name` tag, followed by
  //   "alternate" - where the query matches an alternate name tag (e.g. short_name, brand, operator, etc)
  // Secondary ordering will be on the "area" column:
  //   "area descending" if no location was provided, (worldwide before local)
  //   "area ascending" if location was provided (local before worldwide)
  //
  // [
  //   { match: 'primary',   itemID: String,  area: Number,  kv: String,  nsimple: String },
  //   { match: 'primary',   itemID: String,  area: Number,  kv: String,  nsimple: String },
  //   { match: 'alternate', itemID: String,  area: Number,  kv: String,  nsimple: String },
  //   { match: 'alternate', itemID: String,  area: Number,  kv: String,  nsimple: String },
  //   …
  // ]
  //
  // -or-
  //
  // 2. If the [k,v,n] tuple matches an exclude pattern…
  // Return an Array with a single exclude result, either
  //
  // [ { match: 'excludeGeneric', pattern: String,  kv: String } ]  // "generic" e.g. "Food Court"
  //   or
  // [ { match: 'excludeNamed', pattern: String,  kv: String } ]    // "named", e.g. "Kebabai"
  //
  // About results
  //   "generic" - a generic word that is probably not really a name.
  //     For these, iD should warn the user "Hey don't put 'food court' in the name tag".
  //   "named" - a real name like "Kebabai" that is just common, but not a brand.
  //     For these, iD should just let it be. We don't include these in NSI, but we don't want to nag users about it either.
  //
  // -or-
  //
  // 3. If the [k,v,n] tuple matches nothing of any kind, return `null`
  //
  //
  match(k, v, n, loc) {
    const that = this;
    if (!that.matchIndex) {
      throw new Error('match:  matchIndex not built.');
    }

    // If we were supplied a location, and a that.locationIndex has been set up,
    // get the locationSets that are valid there so we can filter results.
    let matchLocations;
    if (Array.isArray(loc) && that.locationIndex) {
      // which-polygon query returns an array of GeoJSON properties, pass true to return all results
      matchLocations = that.locationIndex([loc[0], loc[1], loc[0], loc[1]], true);
    }

    const nsimple = simplify(n);

    let seen = new Set();
    let results = [];
    gatherResults('primary');
    gatherResults('alternate');
    if (results.length) return results;

    gatherResults('exclude');
    return results.length ? results : null;


    function gatherResults(which) {
      // First try an exact match on k/v
      const kv = `${k}/${v}`;
      let didMatch = tryMatch(which, kv);
      if (didMatch) return;

      // If that didn't work, look in match groups for other pairs considered equivalent to k/v..
      for (let mg in matchGroups) {
        const matchGroup = matchGroups[mg];
        const inGroup = matchGroup.some(otherkv => otherkv === kv);
        if (!inGroup) continue;

        for (let i = 0; i < matchGroup.length; i++) {
          const otherkv = matchGroup[i];
          if (otherkv === kv) continue;  // skip self
          didMatch = tryMatch(which, otherkv);
          if (didMatch) return;
        }
      }

      // If finished 'exclude' pass and still haven't matched anything, try the global `genericWords.json` patterns
      if (which === 'exclude') {
        const regex = [...that.genericWords.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeGeneric', pattern: String(regex) });  // note no `branch`, no `kv`
          return;
        }
      }
    }


    function tryMatch(which, kv) {
      const branch = that.matchIndex.get(kv);
      if (!branch) return;

      if (which === 'exclude') {  // Test name `n` against named and generic exclude patterns
        let regex = [...branch.excludeNamed.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeNamed', pattern: String(regex), kv: kv });
          return;
        }
        regex = [...branch.excludeGeneric.values()].find(regex => regex.test(n));
        if (regex) {
          results.push({ match: 'excludeGeneric', pattern: String(regex), kv: kv });
          return;
        }
        return;
      }

      const leaf = branch[which].get(nsimple);
      if (!leaf || !leaf.size) return;

      // If we get here, we matched something..
      // Prepare the results, calculate areas (if location index was set up)
      let hits = Array.from(leaf).map(itemID => {
        let area = Infinity;
        if (that.itemLocation && that.locationSets) {
          const location = that.locationSets.get(that.itemLocation.get(itemID));
          area = (location && location.properties.area) || Infinity;
        }
        return { match: which, itemID: itemID, area: area, kv: kv, nsimple: nsimple };
      });

      let sortFn = byAreaDescending;

      // Filter the match to include only results valid in the requested `loc`..
      if (matchLocations) {
        hits = hits.filter(isValidLocation);
        sortFn = byAreaAscending;
      }

      if (!hits.length) return;

      // push results
      hits.sort(sortFn).forEach(hit => {
        if (seen.has(hit.itemID)) return;
        seen.add(hit.itemID);
        results.push(hit);
      });

      return true;


      function isValidLocation(hit) {
        if (!that.itemLocation) return true;
        return matchLocations.find(props => props.id === that.itemLocation.get(hit.itemID));
      }
      // Sort smaller (more local) locations first.
      function byAreaAscending(hitA, hitB) {
        return hitA.area - hitB.area;
      }
      // Sort larger (more worldwide) locations first.
      function byAreaDescending(hitA, hitB) {
        return hitB.area - hitA.area;
      }
    }
  }


  //
  // `getWarnings()`
  // Return any warnings discovered when buiding the index.
  // (currently this does nothing)
  //
  getWarnings() {
    return this.warnings;
  }
}
