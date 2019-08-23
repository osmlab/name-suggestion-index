// ES5 for iD, for now
var simplify = require("./simplify.js");
var toParts = require("./to_parts.js");

var matchGroups = require("../config/match_groups.json").matchGroups;

module.exports = function() {
  var _warnings = []; // array of match conflict pairs
  var _ambiguous = {};
  var _matchIndex = {};
  var matcher = {};

  // Create an index of all the keys/simplenames for fast matching
  matcher.buildMatchIndex = function(brands) {
    Object.keys(brands).forEach(function(kvnd) {
      var obj = brands[kvnd];
      var parts = toParts(kvnd);

      if (obj.countryCodes) {
        parts.countryCodes = obj.countryCodes.slice(); // copy
      }

      var nomatches = (obj.nomatch || [])
        .map(function(kvnd) { return toParts(kvnd).kvnsimple; });

      var matchTags = (obj.matchTags || [])
        .map(function(s) { return s.toLowerCase(); });

      var matchNames = (obj.matchNames || [])
        .concat(obj.tags.official_name || [])  // #2732
        .map(simplify);

      var match_kv = [parts.kv]
        .concat(matchTags);

      var match_nsimple = [parts.nsimple]
        .concat(matchNames);

      var match_alt_nsimple = []
        .concat(obj.tags.alt_name || [])       // #2732
        .concat(obj.tags.short_name || [])     // #2732
        .map(simplify);

      match_kv.forEach(function(kv) {
        match_nsimple.forEach(function(nsimple) { tryInsert(kv, nsimple, true); });
        match_alt_nsimple.forEach(function(nsimple) { tryInsert(kv, nsimple, false); });
      });


      function tryInsert(kv, nsimple, warnOnCollisions) {
        var test = kv + nsimple;
        if (nomatches.some(function(s) { return s === test; })) {
          console.log("WARNING match/nomatch conflict for " + test);
          return;
        }

        if (parts.d) {
          // Known ambiguous names with disambiguation string ~(USA) / ~(Canada)
          // FIXME: Name collisions will overwrite the single entry (ok for now)
          if (!_ambiguous[kv]) _ambiguous[kv] = {};
          _ambiguous[kv][nsimple] = parts;

        } else {
          // Names we expect to be unique..
          // Warn if we detect collisions in the primary name, ignore if in an alternate name #2972
          if (!_matchIndex[kv]) _matchIndex[kv] = {};
          var m = _matchIndex[kv][nsimple];
          if (m) { // there already is a match for this name
            if (warnOnCollisions) {
              _warnings.push([m.kvnd, kvnd + ' ("' + nsimple + '")']);
            }
          } else {
            _matchIndex[kv][nsimple] = parts;
          }
        }
      }

    });
  };

  // pass a `key`, `value`, `name` and return the best match,
  // `countryCode` optional (if supplied, must match that too)
  matcher.matchKVN = function(key, value, name, countryCode) {
    return matcher.matchParts(
      toParts(key + "/" + value + "|" + name),
      countryCode
    );
  };

  // pass a parts object and return the best match,
  // `countryCode` optional (if supplied, must match that too)
  matcher.matchParts = function(parts, countryCode) {
    var match = null;
    var inGroup = false;

    // fixme: we currently return a single match for ambiguous
    match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
    if (match && matchesCountryCode(match)) return match;

    // try to return an exact match
    match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
    if (match && matchesCountryCode(match)) return match;

    // look in match groups
    for (var mg in matchGroups) {
      var matchGroup = matchGroups[mg];
      match = null;
      inGroup = false;

      for (var i = 0; i < matchGroup.length; i++) {
        var otherkv = matchGroup[i].toLowerCase();
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

        if (!matchesCountryCode(match)) {
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

  matcher.getWarnings = function() {
    return _warnings;
  };

  return matcher;
};