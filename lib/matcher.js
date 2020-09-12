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
  //      'coop':                   Set ("coop-76454b", "coopfood-a8278b", "coop-ebf2d9", "coop-36e991", …)
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
      items.forEach(item => insertNames(t, k, v, item, 'primary'));
      items.forEach(item => insertNames(t, k, v, item, 'secondary'));
    });


    function insertNames(t, k, v, item, which) {
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


  // // pass a `key`, `value`, `name` and return the best match,
  // // `countryCode` optional (if supplied, must match that too)
  // matcher.matchKVN = (key, value, name, countryCode) => {
  //   return matcher.matchParts(toParts(`${key}/${value}|${name}`), countryCode);
  // };


  // pass a parts object and return the best match,
  // `countryCode` optional (if supplied, must match that too)
  matcher.matchParts = (parts, countryCode) => {
    let match = null;
    let inGroup = false;

    // fixme: we currently return a single match for ambiguous
    match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
    if (match && matchesCountryCode(match)) return match;

    // try to return an exact match
    match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
    if (match && matchesCountryCode(match)) return match;

    // look in match groups
    for (let mg in matchGroups) {
      const matchGroup = matchGroups[mg];
      match = null;
      inGroup = false;

      for (let i = 0; i < matchGroup.length; i++) {
        const otherkv = matchGroup[i].toLowerCase();
        if (!inGroup) {
          inGroup = otherkv === parts.kv;
        }
        if (!match) {
          // fixme: we currently return a single match for ambiguous
          match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
        }
        if (!match) {
          match = _matchIndex[otherkv] && _matchIndex[otherkv][parts.nsimple];
        }

        if (match && !matchesCountryCode(match)) {
          match = null;
        }

        if (inGroup && match) {
          return match;
        }
      }
    }

    return null;

    function matchesCountryCode(match) {
      if (!countryCode) return true;
      if (!match.countryCodes) return true;
      return match.countryCodes.indexOf(countryCode) !== -1;
    }
  };


  matcher.getWarnings = () => _warnings;

  return matcher;
};