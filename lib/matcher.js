// ES5 for iD, for now
var simplify = require('./simplify.js');
var toParts = require('./to_parts.js');

var matchGroups = require('../config/match_groups.json').matchGroups;


module.exports = function() {
    var _ambiguous = {};
    var _matchIndex = {};
    var matcher = {};

    // Create an index of all the keys/simplenames for fast matching
    matcher.buildMatchIndex = function(brands) {
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
                    var test = kv + nsimple;
                    if (nomatches.some(function(s) { return s === test; })) {
                        console.log('WARNING match/nomatch conflict for ' + test);
                        return;
                    }

                    if (parts.d) {
                        // fixme: multiple will clobber over the single entry (ok for now)
                        if (!_ambiguous[kv]) _ambiguous[kv] = {};
                        _ambiguous[kv][nsimple] = parts;
                    } else {
                        if (!_matchIndex[kv]) _matchIndex[kv] = {};
                        // var m = _matchIndex[kv][nsimple];
                        // if (m) {
                        //     console.log('WARNING match conflict for ' + m.kvnd + ' and ' + kvnd);
                        // }
                        _matchIndex[kv][nsimple] = parts;
                    }
                });
            });
        });
    };


    // pass a `key`, `value`, `name` and return the best match
    matcher.matchKVN = function(key, value, name) {
        return matcher.matchParts(toParts(key + '/' + value + '|' + name));
    };

    // pass a parts object and return the best match
    matcher.matchParts = function(parts) {
        var match = null;
        var inGroup = false;

        // fixme: we currently return a single match for ambiguous
        match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
        if (match) return match;

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
                    // fixme: we currently return a single match for ambiguous
                    match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
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


    return matcher;
};
