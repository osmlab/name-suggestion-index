// ES5 for iD, for now
var simplify = require('./simplify.js');

// toParts - split a name-suggestion-index key into parts
// {
//   kvnd:        "amenity/fast_food|Thaï Express~(North America)",
//   kvn:         "amenity/fast_food|Thaï Express",
//   kv:          "amenity/fast_food",
//   k:           "amenity",
//   v:           "fast_food",
//   n:           "Thaï Express",
//   d:           "(North America)",
//   nsimple:     "thaiexpress",
//   kvnnsimple:  "amenity/fast_food|thaiexpress"
// }
module.exports = function toParts(kvnd) {
    var parts = {};
    parts.kvnd = kvnd;

    var kvndparts = kvnd.split('~', 2);
    if (kvndparts.length > 1) parts.d = kvndparts[1];

    parts.kvn = kvndparts[0];
    var kvnparts = parts.kvn.split('|', 2);
    if (kvnparts.length > 1) parts.n = kvnparts[1];

    parts.kv = kvnparts[0];
    var kvparts = parts.kv.split('/', 2);
    parts.k = kvparts[0];
    parts.v = kvparts[1];

    parts.nsimple = simplify(parts.n);
    parts.kvnsimple = parts.kv + '|' + parts.nsimple;
    return parts;
};
