var fs = require('fs'),
    filter = require('./filter.json'),
    raw = require('./topNames.json'),
    canon = require('./canonical.json'),
    correctNames = buildReverseIndex(canon);

var out = {},
    names = {};

for (var fullName in raw) {
    filterValues(fullName);
}

function buildReverseIndex(canon) {
    var rIndex = {};
    for (var can in canon) {
        if (canon[can].matches) {
            for (var i = canon[can].matches.length - 1; i >= 0; i--) {
                var match = canon[can].matches[i];
                rIndex[match] = can;
            }
        }
    }
    return rIndex;
}

function filterValues(fullName) {
    var theName = fullName.split('|', 2),
        tag = theName[0].split('/', 2),
        key = tag[0],
        value = tag[1];
    theName = theName[1];
    if (filter.wanted[key] &&
        filter.wanted[key].indexOf(value) !== -1 &&
        filter.discardedNames.indexOf(theName) == -1) {
        if (correctNames[theName]) theName = correctNames[theName];
        set(key, value, theName, raw[fullName]);
    }
}

function set(k, v, name, count) {
    if (!out[k]) out[k] = {};
    if (!out[k][v]) out[k][v] = {};
    if (!out[k][v][name]) {
        if (canon[name] && canon[name].nix_value && canon[name].nix_value == v) {
            console.log(name + ' ' + v + ' you monster');
        }
        out[k][v][name] = {count: count};
    } else {
        out[k][v][name].count += count;
    }

    if (canon[name]) {
        for (var tag in canon[name].tags) {
            if (!out[k][v][name].tags) out[k][v][name].tags = {};
            out[k][v][name].tags[tag] = canon[name].tags[tag];
        }
    }
}

fs.writeFileSync('name-suggestions.json', JSON.stringify(out, null, 4));
fs.writeFileSync('name-suggestions.min.json', JSON.stringify(out));
