var fs = require('fs'),
    mapping = require('./filter.json'),
    raw = require('./topNames.json'),
    canon = require('./canonical.json'),
    revCanon = buildReverseIndex(canon);

var out = {};

for (var fullName in raw) {
    filterValues(fullName);
}

function buildReverseIndex(canon) {
    var rIndex = {};
    for (var can in revCanon) {
        if (revCanon[can].matches) {
            for (var i = revCanon[can].matches.length - 1; i >= 0; i--) {
                var match = revCanon[can].matches[i];
                rIndex[match] = can;
            }
        }
    }
    return rIndex;
}

function filterValues(fullName) {
    theName = fullName.split('|', 2);
    tag = theName[0].split('/', 2);
    key = tag[0];
    value = tag[1];
    theName = theName[1];
    if (mapping.wanted[key] &&
        mapping.wanted[key].indexOf(value) !== -1 &&
        mapping.discardedNames.indexOf(theName) == -1) {
        if (revCanon[theName]) theName = revCanon[theName];
        set(key, value, theName, raw[fullName]);
    }
}

function set(k, v, name, count) {
    if (!out[k]) out[k] = {};
    if (!out[k][v]) out[k][v] = {};
    if (!out[k][v][name]) out[k][v][name] = {count: count};
    else out[k][v][name].count += count;

    if (canon[name]) {
        for (var tlate in canon[name].translation) {
            out[k][v][name][tlate] = canon[name].translation[tlate];
        }
    }
}

function encode_utf8(string){
    return unescape(encodeURIComponent(string));
}


if (fs.existsSync('name-suggestions.json')) fs.unlinkSync('name-suggestions.json');
fs.appendFileSync('name-suggestions.json', JSON.stringify(out, null, 4));
if (fs.existsSync('name-suggestions.min.json')) fs.unlinkSync('name-suggestions.min.json');
fs.appendFileSync('name-suggestions.min.json', JSON.stringify(out));
