const simplify = require('./simplify.js');
const matchGroups = require('../config/matchGroups.json').matchGroups;
const trees = require('../config/trees.json').trees;
const whichPolygon = require('which-polygon');


module.exports = () => {

  // The `matchIndex` is a specialized structure that allows us to quickly answer
  //   _"Given a [key/value tagpair, name, location], what canonical items (brands etc) can match it?"_
  //
  // The index contains all valid combinations of k/v tagpairs and names
  // matchIndex:
  // {
  //   'primary': {
  //      'k/v': {
  //        'nsimple': Set (…),     // matches for tags like `name`, `name:xx`
  //      },
  //   },
  //   'alternate': {
  //      'k/v': {
  //        'nsimple': Set (…),     // matches for alternate names
  //      },
  //   },
  // }
  //
  // {
  //   'primary': {
  //      'amenity/bank': {
  //        'firstbank':              Set ("firstbank-978cca", "firstbank-9794e6", "firstbank-f17495", …),
  //        …
  //      },
  //      'shop/supermarket': {
  //        'coop':                   Set ("coop-76454b", "coop-ebf2d9", "coop-36e991", …),
  //        'coopfood':               Set ("coopfood-a8278b", …),
  //        …
  //      },
  //      …
  //   },
  //   'alternate': {
  //      'amenity/bank': {
  //        '1stbank':                Set ("firstbank-f17495"),
  //        …
  //      },
  //      'shop/supermarket': {
  //        'coop':                   Set ("coopfood-a8278b", …),
  //        'federatedcooperatives':  Set ("coop-76454b", …),
  //        'thecooperative':         Set ("coopfood-a8278b", …),
  //        …
  //      },
  //      …
  //   }
  // }
  //
  let _matchIndex;

  // The `_itemLocation` structure maps itemIDs to locationSetIDs:
  // {
  //   'firstbank-f17495':  '+[first_bank_western_us.geojson]',
  //   'firstbank-978cca':  '+[first_bank_carolinas.geojson]',
  //   'coop-76454b':       '+[Q16]',
  //   'coopfood-a8278b':   '+[Q23666]',
  //   …
  // }
  let _itemLocation;

  // The `_locationSets` structure maps locationSetIDs to *resolved* locationSets:
  // {
  //   '+[first_bank_western_us.geojson]':  GeoJSON {…},
  //   '+[first_bank_carolinas.geojson]':   GeoJSON {…},
  //   '+[Q16]':                            GeoJSON {…},
  //   '+[Q23666]':                         GeoJSON {…},
  //   …
  // }
  let _locationSets;

  // The _locationIndex is an instance of which-polygon spatial index for the locationSets.
  let _locationIndex;

  let _warnings = [];    // array of match conflict pairs
  let matcher = {};


  //
  // `buildMatchIndex()`
  // Call this to prepare the matcher for use
  //
  // `all` needs to be an Object indexed on a 'tree/key/value' path.
  // (The cache in `file_tree.js` makes this)
  // {
  //    'brands/amenity/bank': [ {}, {}, … ],
  //    'brands/amenity/bar':  [ {}, {}, … ],
  //    …
  // }
  //
  matcher.buildMatchIndex = (all) => {
    if (_matchIndex) return;   // it was built already
    _matchIndex = { primary: {}, alternate: {} };

    Object.keys(all).forEach(tkv => {
      let items = all[tkv];
      if (!Array.isArray(items) || !items.length) return;

      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];
      const thiskv = `${k}/${v}`;
      const tree = trees[t];

      // Primary name patterns
      //   /^(flag:)?name$/i,     // e.g. `name`, `flag:name`
      //   /^name:\w+$/i          // e.g. `name:en`, `name:ru`
      const primaryNames = tree.nameTags.primary.map(s => new RegExp(s, 'i'));

      // Alternate name patterns
      //   /^(brand|country|flag|operator|network|subject)$/i,
      //   /^\w+_name$/i,                                             // e.g. `alt_name`, `short_name`
      //   /^(brand|country|flag|operator|network|subject):\w+$/i,    // e.g. `name:en`, `name:ru`
      //   /^\w+_name:\w+$/i                                          // e.g. `alt_name:en`, `short_name:ru`
      const alternateNames = tree.nameTags.alternate.map(s => new RegExp(s, 'i'));

      // There are a few exceptions to the name matching regexes.
      // Usually a tag suffix contains a language code like `name:en`, `name:ru`
      // but we want to exclude things like `operator:type`, `name:etymology`, etc..
      const notNames = /:(colour|type|left|right|etymology|pronunciation|wikipedia)$/i;

      // For certain categories we do not want to match generic pairs like `building/yes` or `amenity/yes`
      const skipGeneric = skipGenericMatches(t, k, v);

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


      // Add each item to the matchIndex
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

        if (!skipGeneric) {
          kvTags = kvTags
            .concat(Array.from(genericKV));  // #3454 - match some generic tags
        }

        Object.keys(item.tags).forEach(osmkey => {    // Check all tags for "names"
          primaryNames.forEach(regex => {
            if (!regex.test(osmkey) || notNames.test(osmkey)) return;    // osmkey is not a namelike tag, skip
            kvTags.forEach(kv => insertName(_matchIndex.primary, kv, simplify(item.tags[osmkey]), item.id));
          });

          alternateNames.forEach(regex => {
            if (!regex.test(osmkey) || notNames.test(osmkey)) return;    // osmkey is not a namelike tag, skip
            kvTags.forEach(kv => insertName(_matchIndex.alternate, kv, simplify(item.tags[osmkey]), item.id));
          });
        });

        // Index `matchNames` after indexing all other names..
        let keepMatchNames = new Set();
        (item.matchNames || []).forEach(matchName => {
          // If this matchname isn't already indexed, add it to the alternate index
          const nsimple = simplify(matchName);
          kvTags.forEach(kv => {
            const primary = _matchIndex.primary[kv] && _matchIndex.primary[kv][nsimple];
            const alternate = _matchIndex.alternate[kv] && _matchIndex.alternate[kv][nsimple];
            const inPrimary = primary && primary.has(item.id);
            const inAlternate = alternate && alternate.has(item.id);

            if (!inPrimary && !inAlternate) {
              insertName(_matchIndex.alternate, kv, nsimple, item.id);
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
    function insertName(cache, kv, nsimple, itemID) {
      if (!nsimple)  return;

      if (!cache[kv])           cache[kv] = {};
      if (!cache[kv][nsimple])  cache[kv][nsimple] = new Set();

      let set = cache[kv][nsimple];
      set.add(itemID);
    }

    // For certain categories we do not want to match generic pairs like `building/yes` or `amenity/yes`
    function skipGenericMatches(t, k, v) {
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
  };


  //
  // `buildLocationIndex()`
  // Call this to prepare a which-polygon location index.
  // This *resolves* all the locationSets into GeoJSON, which takes some time.
  // You can skip this step if you don't care about matching within a location.
  //
  matcher.buildLocationIndex = (all, loco) => {
    if (_locationIndex) return;   // it was built already

    _itemLocation = {};
    _locationSets = {};

    Object.keys(all).forEach(tkv => {
      let items = all[tkv];
      if (!Array.isArray(items) || !items.length) return;

      items.forEach(item => {
        if (_itemLocation[item.id]) return;   // we've seen item id already - shouldn't be possible?

        const resolved = loco.resolveLocationSet(item.locationSet);   // resolve a feature for this locationSet
        _itemLocation[item.id] = resolved.id;                         // link it to the item

        if (_locationSets[resolved.id]) return;   // we've seen this locationSet feature before..

        // First time seeing this locationSet feature, make a copy and add to locationSet cache..
        let feature = _cloneDeep(resolved.feature);
        feature.id = resolved.id;      // Important: always use the locationSet `id` (`+[Q30]`), not the feature `id` (`Q30`)
        feature.properties.id = resolved.id;

        if (!feature.geometry.coordinates.length || !feature.properties.area) {
          console.error('');
          console.error(`buildLocationIndex: locationSet ${resolved.id} for ${item.id} resolves to an empty feature:`);
          console.error(JSON.stringify(feature));
          console.error('');
          return;
        }

        _locationSets[resolved.id] = feature;
      });
    });

    _locationIndex = whichPolygon({ type: 'FeatureCollection', features: Object.values(_locationSets) });

    function _cloneDeep(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  };


  //
  // `match()`
  // Pass parts and return an array of matches.
  // `k` - key
  // `v` - value
  // `n` - namelike
  // `loc` - optional - [lon,lat] location to search
  //
  // Returns an array of match results, or null if no match.
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
  //    { match: 'primary',   itemID: String,  area: Number,  kv: String,  nsimple: String },
  //    { match: 'primary',   itemID: String,  area: Number,  kv: String,  nsimple: String },
  //    { match: 'alternate', itemID: String,  area: Number,  kv: String,  nsimple: String },
  //    { match: 'alternate', itemID: String,  area: Number,  kv: String,  nsimple: String },
  //    …
  // ]
  //
  matcher.match = (k, v, n, loc) => {
    if (!_matchIndex) {
      throw new Error('match:  matchIndex not built.');
    }

    // If we were supplied a location, and a _locationIndex has been set up,
    // get the locationSets that are valid there so we can filter results.
    let matchLocations;
    if (Array.isArray(loc) && _locationIndex) {
      // which-polygon query returns an array of GeoJSON properties, pass true to return all results
      matchLocations = _locationIndex([loc[0], loc[1], loc[0], loc[1]], true);
    }

    const nsimple = simplify(n);

    let seen = new Set();
    let results = [];
    gatherMatches('primary');
    gatherMatches('alternate');

    return results.length ? results : null;


    function gatherMatches(which) {
      // First try an exact match on k/v
      const kv = `${k}/${v}`;
      let didMatch = tryMatch(kv, nsimple, which);
      if (didMatch) return;

      // If that didn't work, look in match groups for other pairs considered equivalent to k/v..
      for (let mg in matchGroups) {
        const matchGroup = matchGroups[mg];
        const inGroup = matchGroup.some(otherkv => otherkv === kv);
        if (!inGroup) continue;

        for (let i = 0; i < matchGroup.length; i++) {
          const otherkv = matchGroup[i];
          if (otherkv === kv) continue;  // skip self
          didMatch = tryMatch(otherkv, nsimple, which);
          if (didMatch) return;
        }
      }
    }


    function tryMatch(kv, nsimple, which) {
      const trunk = _matchIndex[which];
      if (!trunk) return;
      const branch = trunk[kv];
      if (!branch) return;
      const leaf = branch[nsimple];
      if (!leaf) return;

      // If we get here, we matched something..
      // Prepare the results, calculate areas (if location index was set up)
      let hits = Array.from(leaf).map(itemID => {
        let area = Infinity;
        if (_itemLocation && _locationSets) {
          const location = _locationSets[_itemLocation[itemID]];
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
        if (!_itemLocation) return true;
        return matchLocations.find(props => props.id === _itemLocation[hit.itemID]);
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
  };


  //
  // `getWarnings()`
  // Return any warnings discovered when buiding the index.
  // (currently this does nothing)
  //
  matcher.getWarnings = () => _warnings;


  return matcher;
};
