const colors = require('colors/safe');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const allNames = require('./dist/allNames.json');
const filters = require('./config/filters.json');

// all names start out in discard..
var discard = Object.assign({}, allNames);
var keep = {};

filterNames();
canonicalizeNames();
mergeConfig();


//
// `filterNames()` will process a `dist/allNames.json` file,
// splitting the data up into 2 files:
//
// `dist/keepNames.json` - candidates for suggestion presets
// `dist/discardNames.json` - everything else
//
// The file format is identical to the `allNames.json` file:
// "key/value|name": count
// "shop/coffee|Starbucks": 8284
//
function filterNames() {
    console.log('filtering names');
    console.time(colors.green('names filtered'));

    // Start clean
    shell.rm('-f', ['dist/keepNames.json', 'dist/discardNames.json']);

    // filter by keepTags (move from discard -> keep)
    filters.keepTags.forEach(function(s) {
        var re = new RegExp(s, 'i');
        for (var key in discard) {
            var tag = key.split('|', 2)[0];
            if (re.test(tag)) {
                keep[key] = discard[key];
                delete discard[key];
            }
        }
    });

    // filter by discardNames (move from keep -> discard)
    filters.discardNames.forEach(function(s) {
        var re = new RegExp(s, 'i');
        for (var key in keep) {
            var name = key.split('|', 2)[1];
            if (re.test(name)) {
                discard[key] = keep[key];
                delete keep[key];
            }
        }
    });

    fs.writeFileSync('dist/discardNames.json', stringify(sort(discard)));
    fs.writeFileSync('dist/keepNames.json', stringify(sort(keep)));
    console.timeEnd(colors.green('names filtered'));
}


//
// `canonicalizeNames()`
// This is just a fancy way of saying - pick the single best name out of the
// many we might find in the keepNames dataset
//
function canonicalizeNames() {
    console.log('canonicalizing names');
    console.time(colors.green('names canonicalized'));

// WIP: first we need to make a new canonical.json config file.
    var canonical = require('./canonical.json');
    var rIndex = buildReverseIndex(canonical);

// WIP: keep only matches property
    var canonical2 = {};
    Object.keys(canonical).forEach(function(k) {
        var matches = canonical[k].matches;
        if (!matches) return;
        canonical2[k] = { matches: matches };
    });

    fs.writeFileSync('config/canonical.json', JSON.stringify(sort(canonical2), null, 2));
// WIP: end

    console.timeEnd(colors.green('names canonicalized'));


    function buildReverseIndex(canonical) {
        var rIndex = {};
        for (var key in canonical) {
            if (canonical[key].matches) {
                for (var i = canonical[key].matches.length - 1; i >= 0; i--) {
                    var match = canonical[key].matches[i];
if (rIndex[match]) {
console.error('ERROR - collision in canonical: ' + match);
}
                    rIndex[match] = key;
                }
            }
        }
        return rIndex;
    }
}


//
// mergeConfig() takes the names we are keeping and update
// `config/names.json`
//
function mergeConfig() {
    console.log('merging config/names.json');
    console.time(colors.green('config updated'));

    // Read existing config.
    var configNames;
    try {
        configNames = require('./config/names.json');
    } catch(e) {
        configNames = {};
    }

    // First, warn if deprecated entries exist in `config/names.json`.
    // They can be removed because they no longer exist in `keepNames.json`.
    var warned = false;
    Object.keys(configNames).forEach(function(k) {
        if (!keep[k]) {
            if (!warned) {
                console.warn(colors.yellow('Warning - Deprecated entries in config/names.json:'));
                warned = true;
            }
            console.warn(colors.yellow('  ' + k));
        }
    });

    // Create or update entries in `config/names.json`
    Object.keys(keep).forEach(function(k) {
        var parts = k.split('|', 2);
        var tag = parts[0].split('/', 2);
        var key = tag[0];
        var value = tag[1];
        var name = parts[1];

        var obj = configNames[k];
        if (!obj) {
            obj = { count: 0, tags: {} };
            obj.tags.name = name;
            obj.tags[key] = value;
        }
        obj.count = keep[k];
        configNames[k] = obj;
    });

    fs.writeFileSync('config/names.json', JSON.stringify(sort(configNames), null, 2));
    console.timeEnd(colors.green('config updated'));
}


//
// Returns an object with sorted keys.
// (this is useful for file diffing)
//
function sort(obj) {
    var sorted = {};
    Object.keys(obj).sort().forEach(function(k) {
        sorted[k] = obj[k];
    });
    return sorted;
}

