// ES5 for iD, for now
var simplify = require('./simplify.js');
var toParts = require('./to_parts.js');

// Load and check matchGroups.json
var matchGroups = require('../config/matchGroups.json').matchGroups;


var _ambiguous = {};
var _matchIndex = {};

// Create an index of all the keys/simplenames for fast matching
exports.buildMatchIndex = function(brands) {
    Object.keys(brands).forEach(function(kvnd) {
        var obj = brands[kvnd];
        var parts = toParts(kvnd);

        var matchTags = (obj.matchTags || [])
            .map(function(s) { return s.toLowerCase(); });
        var matchNames = (obj.matchNames || [])
            .map(simplify);
        var nomatches = (obj.nomatch || [])
            .map(function(kvnd) { return toParts(kvnd).kvnsimple; });

        var match_kv = [parts.kv].concat(matchTags);
        var match_nsimple = [parts.nsimple].concat(matchNames);

        match_kv.forEach(function(kv) {
            match_nsimple.forEach(function(nsimple) {
                var test = `${kv}${nsimple}`;
                if (nomatches.some(function(s) { return s === test; })) {
                    console.log(` WARNING match/nomatch conflict for ${test}!`);
                    return;
                }

                if (parts.d) {
                    // fixme: multiple will clobber over the single entry (ok for now)
                    if (!_ambiguous[kv]) _ambiguous[kv] = {};
                    _ambiguous[kv][nsimple] = parts.kvnsimple;
                } else {
                    if (!_matchIndex[kv]) _matchIndex[kv] = {};
                    _matchIndex[kv][nsimple] = parts.kvnsimple;
                }
            });
        });
    });
};


// pass a parts object
exports.matchKey = function(parts) {
    var results = new Set();
    var match = null;
    var inGroup = false;

    // fixme: we currently return a single garbage match for ambiguous
    match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
    if (match) return match + '~?';

    // try to return an exact match
    match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
    if (match) return match;

    // look in match groups
    for (var mg in matchGroups) {
        var matchGroup = matchGroups[mg];
        match = null;
        inGroup = false;

        for (var i = 0; i < matchGroup.length; i++) {
            var otherkv = matchGroup[i].toLowerCase();
            if (!inGroup) {
                inGroup = (otherkv === parts.kv);
            }
            if (!match) {
                // fixme: we currently return a single garbage match for ambiguous
                match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
                if (match) match = match + '~?';
            }
            if (!match) {
                match = _matchIndex[otherkv] && _matchIndex[otherkv][parts.nsimple];
            }

            if (inGroup && match) {
                return match;
            }
        }
    }

    return null;
};
