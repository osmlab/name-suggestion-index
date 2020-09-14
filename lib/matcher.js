const simplify = require('./simplify.js');
const matchGroups = require('../config/match_groups.json').matchGroups;
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

  // The `_itemToLocation` structure maps itemIDs to locationSetIDs:
  // {
  //   'firstbank-f17495':  '+[first_bank_western_us.geojson]',
  //   'firstbank-978cca':  '+[first_bank_carolinas.geojson]',
  //   'coop-76454b':       '+[Q16]',
  //   'coopfood-a8278b':   '+[Q23666]',
  //   …
  // }
  let _itemToLocation;

  // the _locationIndex is an instance of which-polygon spatial index for the location sets.
  let _locationIndex;

  let _warnings = [];    // array of match conflict pairs
  let matcher = {};

  // additional tag to get a name from
  const fallbackName = {
    'brands': 'brand',
    'operators': 'operator',
    'networks': 'network'
  };


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
  matcher.buildMatchIndex = (all, loco) => {
    if (_matchIndex) return;   // it was built already
    _matchIndex = {};
    _itemToLocation = {};

    Object.keys(all).forEach(tkv => {
      let items = all[tkv];
      if (!Array.isArray(items) || !items.length) return;

      const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
      const t = parts[0];
      const k = parts[1];
      const v = parts[2];

      // perform two passes - once for primary names, once for secondary/alternate names
      items.forEach(item => _insertNames(t, k, v, item, 'primary'));
      items.forEach(item => _insertNames(t, k, v, item, 'secondary'));
    });


    function _insertNames(t, k, v, item, which) {
      if (!item.id) return;

      // Remember this item's locationSetID for later, in case we need do location filtering.
      if (which === 'primary') {
        _itemToLocation[item.id] = loco.validateLocationSet(item.locationSet).id;
      }

      const match_kv = [`${k}/${v}`]
        .concat(item.matchTags || [])
        .concat([`${k}/yes`, `building/yes`])   // #3454 - match some generic tags
        .map(s => s.toLowerCase());

      let match_name = [];
      if (which === 'primary') {
        match_name = []
          .concat(item.tags.name || [])
          .concat(item.tags.official_name || []);   // #2732 - match alternate names

      } else if (which === 'secondary') {
        match_name = []
          .concat(item.tags[fallbackName[t]] || [])
          .concat(item.tags.alt_name || [])         // #2732 - match alternate names
          .concat(item.tags.short_name || [])       // #2732 - match alternate names
          .concat(item.matchNames || []);
      }

      if (!match_name.length) return;  // nothing to do

      match_kv.forEach(kv => {
        if (!_matchIndex[kv])  _matchIndex[kv] = {};

        match_name.forEach(name => {
          const nsimple = simplify(name);
          if (!_matchIndex[kv][nsimple])  _matchIndex[kv][nsimple] = new Set();

          const set = _matchIndex[kv][nsimple];
          if (set.has(item.id)) {
            // Warn if we detect collisions in a primary name.
            // Skip warning if a secondary name or a generic `*=yes` tag - #2972 / #3454
            if (which === 'primary' && !/\/yes$/.test(kv)) {
              _warnings.push([item.id, `${item.id} (${kv}/${nsimple})`]);

            } else if (which === 'secondary') {
              // Automatically remove redundant matchNames  #3417
              // (i.e. This name got indexed some other way, so it doesn't need to be in matchNames.)
              if (Array.isArray(item.matchNames) && item.matchNames.length) {
                item.matchNames = item.matchNames.filter(n => n !== name);
                if (!item.matchNames.length) delete item.matchNames;
              }
            }
          } else {
            set.add(item.id);
          }
        });
      });

    }
  };


  //
  // buildLocationIndex()
  // Call this to prepare a which-polygon location index.
  // You can skip this step if you don't care about location.
  //
  matcher.buildLocationIndex = (all, loco) => {
    if (_locationIndex) return;   // it was built already

    let locationSets = {};
    Object.keys(all).forEach(tkv => {
      let items = all[tkv];
      if (!Array.isArray(items) || !items.length) return;

      items.forEach(item => {
        let feature = loco.resolveLocationSet(item.locationSet).feature;
        locationSets[feature.id] = feature;
      });
    });

    _locationIndex = whichPolygon({ type: 'FeatureCollection', features: Object.values(locationSets) });
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

    // If we were supplied a location, and a locationIndex has been set up,
    // get the locationSets that are valid there so we can filter results.
    let filterLocations;
    if (Array.isArray(loc) && _locationIndex) {
      filterLocations = new Set(_locationIndex([loc[0], loc[1], loc[0], loc[1]], true).map(props => props.id));
    }

    const kv = `${k}/${v}`;
    const nsimple = simplify(n);

    // Look for an exact match on kv..
    let m = _tryMatch(kv, nsimple, loc);
    if (m) return m;

    // Look in match groups for other kv pairs considered equilivent to kv..
    for (let mg in matchGroups) {
      const matchGroup = matchGroups[mg];
      const inGroup = matchGroup.some(otherkv => otherkv === kv);
      if (!inGroup) continue;

      for (let i = 0; i < matchGroup.length; i++) {
        const otherkv = matchGroup[i];
        if (otherkv === kv) continue;  // skip self
        m = _tryMatch(otherkv, nsimple, loc);
        if (m) return m;
      }
    }

    // didn't match anything
    return null;


    function _tryMatch(kv, nsimple, loc) {
      if (!_matchIndex[kv]) return null;

      let m = _matchIndex[kv][nsimple];
      if (!m) return null;

      let itemIDs = Array.from(m);

      // Filter the match to include only results valid in that location.
      if (filterLocations) {
        itemIDs = itemIDs.filter(itemID => filterLocations.has(_itemToLocation[itemID]));
      }

      return itemIDs.length ? itemIDs : null;
    }
  };


  //
  // getWarnings()
  // Return any warnings discovered when buiding the index.
  //
  matcher.getWarnings = () => _warnings;


  return matcher;
};