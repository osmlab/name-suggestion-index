const simplify = require('./simplify.js');
const matchGroups = require('../config/matchGroups.json').matchGroups;
const whichPolygon = require('which-polygon');


module.exports = () => {

  // The `matchIndex` is a specialized structure that allows us to quickly answer
  //   _"Given a [key/value tagpair, name, location], what canonical items (brands etc) can match it?"_
  //
  // The index contains all valid combinations of
  // primary/alternate tagpairs and primary/alternate names
  //
  // matchIndex:
  // {
  //    'amenity/bank': {
  //      '1stbank':          Set ("firstbank-f17495"),
  //      'firstbank':        Set ("firstbank-978cca", "firstbank-9794e6", "firstbank-f17495", …),
  //      …
  //    },
  //    'shop/supermarket': {
  //      'coop':                   Set ("coop-76454b", "coopfood-a8278b", "coop-ebf2d9", "coop-36e991", …),
  //      'coopfood':               Set ("coopfood-a8278b"),
  //      'federatedcooperatives':  Set ("coop-76454b"),
  //      'thecooperative':         Set ("coopfood-a8278b"),
  //      …
  //    },
  //    …
  // }
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
  // buildMatchIndex()
  // Call this to prepare the matcher for use
  //
  // `all` needs to be an Object indexed on a 'tree/key/value' path.
  // (The cache in `file_tree.js` and `build_brands.js` makes this)
  // {
  //    'brands/amenity/bank': [ {}, {}, … ],
  //    'brands/amenity/bar':  [ {}, {}, … ],
  //    …
  // }
  //
  matcher.buildMatchIndex = (all) => {
    if (_matchIndex) return;   // it was built already
    _matchIndex = {};

    Object.keys(all).forEach(tkv => {
      let items = all[tkv];
      if (!Array.isArray(items) || !items.length) return;

      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];

      // Perform two passes - first gather primary name tag, then gather secondary/alternate names
      items.forEach(item => _indexItem(t, k, v, item, 'primary'));
      items.forEach(item => _indexItem(t, k, v, item, 'secondary'));
    });


    function _indexItem(t, k, v, item, which) {
      if (!item.id) return;
      const tags = item.tags;
      const thiskv = `${k}/${v}`;

      // First time - perform some setup steps on this item before anything else.
      if (which === 'primary') {
        // Automatically remove redundant `matchTags` - #3417
        // (i.e. This kv is already covered by matchGroups, so it doesn't need to be in `item.matchTags`)
        if (Array.isArray(item.matchTags) && item.matchTags.length) {
          Object.values(matchGroups).forEach(matchGroup => {
            const inGroup = matchGroup.some(matchkv => matchkv === thiskv);
            if (!inGroup) return;

            // keep matchTags *not* already in match group
            item.matchTags = item.matchTags
              .filter(matchTag => !matchGroup.some(matchkv => matchkv === matchTag));
          });

          if (!item.matchTags.length) delete item.matchTags;
        }
      }


      // key/value tagpairs to insert into the index..
      let kvTags = [`${thiskv}`];
      if (t !== 'transit' && t !== 'flags') {
        kvTags.push(`${k}/yes`, 'building/yes');  // #3454 - match some generic tags
      }
      kvTags = kvTags.concat(item.matchTags || []);

      // name variations to insert into the index..
      let nameTags = [];
      if (which === 'primary') {
        nameTags = [/^(flag:)?name$/];

      } else if (which === 'secondary') {          // #2732 - match alternate names
        nameTags = [
          /^(brand|country|flag|operator|network|subject)$/,
          /^\w+_name$/,                                                 // e.g. `alt_name`, `short_name`
          /^(name|brand|country|flag|operator|network|subject):\w+$/,   // e.g. `name:en`, `name:ru`
          /^\w+_name:\w+$/                                              // e.g. `alt_name:en`, `short_name:ru`
        ];
      }

      kvTags.forEach(kv => {
        if (!_matchIndex[kv])  _matchIndex[kv] = {};

        nameTags.forEach(nameTag => {
          const re = new RegExp(nameTag, 'i');
          Object.keys(tags).forEach(osmkey => {
            if (!re.test(osmkey)) return;    // osmkey is not a name tag, skip

            // There are a few exceptions to the nameTag matching regexes.
            // Usually a tag suffix contains a language code like `name:en`, `name:ru`
            // but we want to exclude things like `operator:type`, `name:etymology`, etc..
            if (/:(type|left|right|etymology|wikipedia)$/.test(osmkey)) return;

            const name = tags[osmkey];
            const nsimple = simplify(name);
            if (!_matchIndex[kv][nsimple])  _matchIndex[kv][nsimple] = new Set();

            let set = _matchIndex[kv][nsimple];
            if (set.has(item.id)) {
              // Warn if we detect collisions on `name` tag.
              // For example, multiple items with the same k/v that simplify to the same simplename
              // "Bed Bath & Beyond" and "Bed Bath and Beyond"
              if (osmkey === 'name') {
                _warnings.push([item.id, `${item.id} (${kv}/${nsimple})`]);
              }
            } else {
              set.add(item.id);
            }
          });
        });

        // check `matchNames` after indexing all other names
        if (which === 'secondary') {
          let keepMatchNames = [];

          (item.matchNames || []).forEach(matchName => {
            const nsimple = simplify(matchName);
            if (!_matchIndex[kv][nsimple])  _matchIndex[kv][nsimple] = new Set();

            let set = _matchIndex[kv][nsimple];
            if (!set.has(item.id)) {
              set.add(item.id);
              keepMatchNames.push(matchName);
            }
          });

          // Automatically remove redundant `matchNames` - #3417
          // (i.e. This name got indexed some other way, so it doesn't need to be in `item.matchNames`)
          if (keepMatchNames.length) {
            item.matchNames = keepMatchNames;
          } else {
            delete item.matchNames;
          }
        }

      });
    }
  };


  //
  // buildLocationIndex()
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
        if (_itemLocation[item.id]) return;

        const resolved = loco.resolveLocationSet(item.locationSet);
        if (_locationSets[resolved.id]) return;

        // important: always use the locationSet `id` (`+[Q30]`), not the feature `id` (`Q30`)
        const feature = _cloneDeep(resolved.feature);
        feature.id = resolved.id;
        feature.properties.id = resolved.id;

        if (!feature.geometry.coordinates.length || !feature.properties.area) {
          console.error('');
          console.error(`buildLocationIndex: locationSet ${resolved.id} for ${item.id} resolves to invalid feature:`);
          console.error(JSON.stringify(feature));
          console.error('');
          return;
        }

        _itemLocation[item.id] = resolved.id;
        _locationSets[resolved.id] = feature;
      });
    });

    _locationIndex = whichPolygon({ type: 'FeatureCollection', features: Object.values(_locationSets) });

    function _cloneDeep(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  };


  //
  // match()
  // Pass parts and return an array of matches.
  // `k` - key
  // `v` - value
  // `n` - name
  // `loc` - optional - [lon,lat] location to search
  //
  // Returns an array of matches, or null if no match
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

    const kv = `${k}/${v}`;
    const nsimple = simplify(n);

    // Look for an exact match on kv..
    let m = tryMatch(kv, nsimple);
    if (m) return m;

    // Look in match groups for other pairs considered equivalent to kv..
    for (let mg in matchGroups) {
      const matchGroup = matchGroups[mg];
      const inGroup = matchGroup.some(otherkv => otherkv === kv);
      if (!inGroup) continue;

      for (let i = 0; i < matchGroup.length; i++) {
        const otherkv = matchGroup[i];
        if (otherkv === kv) continue;  // skip self
        m = tryMatch(otherkv, nsimple);
        if (m) return m;
      }
    }

    // didn't match anything
    return null;


    function tryMatch(kv, nsimple) {
      if (!_matchIndex[kv]) return null;

      let m = _matchIndex[kv][nsimple];
      if (!m) return null;

      let itemIDs = Array.from(m);
      let sortFn = byAreaDescending;

      // Filter the match to include only results valid in the requested `loc`.
      if (matchLocations) {
        itemIDs = itemIDs.filter(isValidLocation);
        sortFn = byAreaAscending;
      }

      return itemIDs.length ? itemIDs.sort(sortFn) : null;


      function isValidLocation(itemID) {
        if (!_itemLocation) return true;
        return matchLocations.find(props => props.id === _itemLocation[itemID]);
      }

      // Sort smaller (more local) locations first.
      function byAreaAscending(itemA, itemB) {
        if (!_itemLocation || !_locationSets) return 0;
        const locationA = _locationSets[_itemLocation[itemA]];
        const locationB = _locationSets[_itemLocation[itemB]];
        const areaA = (locationA && locationA.properties.area) || Infinity;
        const areaB = (locationB && locationB.properties.area) || Infinity;
        return areaA - areaB;
      }

      // Sort larger (more worldwide) locations first.
      function byAreaDescending(itemA, itemB) {
        if (!_itemLocation || !_locationSets) return 0;
        const locationA = _locationSets[_itemLocation[itemA]];
        const locationB = _locationSets[_itemLocation[itemB]];
        const areaA = (locationA && locationA.properties.area) || Infinity;
        const areaB = (locationB && locationB.properties.area) || Infinity;
        return areaB - areaA;
      }
    }
  };


  //
  // getWarnings()
  // Return any warnings discovered when buiding the index.
  //
  matcher.getWarnings = () => _warnings;


  return matcher;
};
