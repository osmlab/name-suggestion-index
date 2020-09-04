const simplify = require('./simplify.js');
// const toParts = require('./to_parts.js');

const matchGroups = require('../config/match_groups.json').matchGroups;


module.exports = () => {
  let _warnings = [];  // array of match conflict pairs
  // let _ambiguous = {};
  let _matchIndex = {};
  let matcher = {};

  // Create an index of all the keys/simplenames for fast matching
  matcher.buildMatchIndex = (all) => {
    Object.keys(all).forEach(tree => {
      Object.keys(all[tree]).forEach(kv => {

        //TODO!!

        // two passes - once for primary names, once for secondary/alternate names
        const items = all[tree][k][v];
        items.forEach(item => insertNames(k, v, item, 'primary'));
        items.forEach(item => insertNames(k, v, item, 'secondary'));

      });
    });


    function insertNames(k, v, item, which) {
      if (!item.id) return;
      // const parts = toParts(kvnd);

      // // Exit early for ambiguous names in the second pass.
      // // They were collected in the first pass and we don't gather alt names for them.
      // if (which === 'secondary' && parts.d) return;

      // if (item.countryCodes) {
      //   parts.countryCodes = item.countryCodes.slice();  // copy
      // }

      // const nomatches = (item.nomatch || []);
      // if (nomatches.some(s => s === kvnd)) {
      //   console.log(`WARNING match/nomatch conflict for ${kvnd}`);
      //   return;
      // }

      const match_kv = [`${k}/${v}`]
        .concat(item.matchTags || [])
        .concat([`${k}/yes`, `building/yes`])   // #3454 - match some generic tags
        .map(s => s.toLowerCase());

      let match_nsimple = [];
      if (which === 'primary') {
        match_nsimple = []
          .concat(item.tags.name || [])
          .concat(item.matchNames || [])
          .concat(item.tags.official_name || [])   // #2732 - match alternate names
          .map(simplify);

      } else if (which === 'secondary') {
        match_nsimple = []
          .concat(item.tags.alt_name || [])        // #2732 - match alternate names
          .concat(item.tags.short_name || [])      // #2732 - match alternate names
          .map(simplify);
      }

      if (!match_nsimple.length) return;  // nothing to do

      match_kv.forEach(kv => {
        match_nsimple.forEach(nsimple => {

          if (!_matchIndex[kv])            _matchIndex[kv] = {};
          if (!_matchIndex[kv][nsimple])   _matchIndex[kv][nsimple] = {};
          _matchIndex[kv][nsimple][item.id] = true;

          // if (parts.d) {
          //   // Known ambiguous names with disambiguation string ~(USA) / ~(Canada)
          //   // FIXME: Name collisions will overwrite the initial entry (ok for now)
          //   if (!_ambiguous[kv]) _ambiguous[kv] = {};
          //   _ambiguous[kv][nsimple] = parts;

          // } else {
          //   // Names we mostly expect to be unique..
          //   if (!_matchIndex[kv]) _matchIndex[kv] = {};

          //   const m = _matchIndex[kv][nsimple];
          //   if (m) {  // There already is a match for this name, skip it
          //     // Warn if we detect collisions in a primary name.
          //     // Skip warning if a secondary name or a generic `*=yes` tag - #2972 / #3454
          //     if (which === 'primary' && !/\/yes$/.test(kv)) {
          //       _warnings.push([m.kvnd, `${kvnd} (${kv}/${nsimple})`]);
          //     }
          //   } else {
          //     _matchIndex[kv][nsimple] = parts;   // insert
          //   }
          // }
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