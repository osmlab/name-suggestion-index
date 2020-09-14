const simplify = require('./simplify.js');
const matchGroups = require('../config/match_groups.json').matchGroups;


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
  let _matchIndex = {};
  let _warnings = [];    // array of match conflict pairs
  let matcher = {};

  // additional tag to get a name from
  const fallbackName = {
    'brands': 'brand',
    'operators': 'operator',
    'networks': 'network'
  };


  // `all` needs to be an Object indexed on a 'tree/key/value' path.
  // (The cache in `file_tree.js` and `build_brands.js` makes this)
  // {
  //    'brands/amenity/bank': [ {}, {}, … ],
  //    'brands/amenity/bar':  [ {}, {}, … ],
  //    …
  // }
  matcher.buildMatchIndex = (all) => {
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


  // Pass parts and return an array of matches.
  // `k` - key
  // `v` - value
  // `n` - name
  // `loc` - optional - [lon,lat] location to search
  //
  // Returns an array of matches, or null if no match
  //
  matcher.match = (k, v, n, loc) => {
    const kv = `${k}/${v}`;
    const nsimple = simplify(n);

    // look for an exact match from the index
    let m = _tryMatch(kv, nsimple, loc);
    if (m) return m;

    // look in match groups for alternate kv tags to match
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

      let arr = Array.from(m);

      // if we were supplied a location, filter results that are valid there.
      if (Array.isArray(loc)) {
        arr = arr.filter(id => {
// TODO add flatbush
          return true;
        });
      }

      return arr.length ? arr : null;
    }
  };


  matcher.getWarnings = () => _warnings;


  return matcher;
};