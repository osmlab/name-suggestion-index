const colors = require('colors/safe');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const allNames = require('./dist/allNames.json');
const filters = require('./config/filters.json');

// all names start out in discard..
var discard = Object.assign({}, allNames);
var keep = {};
var canonical = {};

filterNames();
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
// mergeConfig() takes the names we are keeping and update
// `config/canonical.json`
//
function mergeConfig() {
    console.log('merging config/canonical.json');
    console.time(colors.green('config updated'));

    // Read existing config.
    var canonical;
    try {
        canonical = require('./config/canonical.json');
    } catch(e) {
        canonical = {};
    }

    var rIndex = buildReverseIndex(canonical);

    // First, warn about entries in `config/canonical.json` not matched to common keepNames.
    var warned = false;
    Object.keys(canonical).forEach(function(k) {
        if (!keep[k] || rIndex[k]) {
            if (!warned) {
                console.warn(colors.yellow('Warning - uncommon entries in config/canonical.json:'));
                warned = true;
            }
            if (rIndex[k]) {
                console.warn(colors.yellow('  ' + k + ' matches ' + rIndex[k]));
            } else {
                console.warn(colors.yellow('  ' + k));
            }
        }
    });



    // Create/update entries in `config/canonical.json`
    Object.keys(keep).forEach(function(k) {
        if (rIndex[k]) return;

        var obj = canonical[k];

        if (!obj) {
            var parts = k.split('|', 2);
            var tag = parts[0].split('/', 2);
            var key = tag[0];
            var value = tag[1];
            var name = parts[1];

            obj = { count: 0, tags: {} };
            obj.tags.name = name;
            obj.tags[key] = value;
        }

        obj.count = keep[k];
        obj.tags = sort(obj.tags);

        canonical[k] = sort(obj);
    });

    fs.writeFileSync('config/canonical.json', JSON.stringify(sort(canonical), null, 2));
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



function buildReverseIndex(obj) {
    var rIndex = {};
    for (var key in obj) {
        if (obj[key].matches) {
            for (var i = obj[key].matches.length - 1; i >= 0; i--) {
                var match = obj[key].matches[i];
if (rIndex[match]) {
console.error('ERROR - collision in canonical: ' + match);
}
                rIndex[match] = key;
            }
        }
    }
    return rIndex;
}

