const colors = require('colors/safe');
const diacritics = require('diacritics');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const allNames = require('./dist/allNames.json');
const filters = require('./config/filters.json');
var canonical = require('./config/canonical.json');

// all names start out in discard..
var discard = Object.assign({}, allNames);
var keep = {};

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
    filters.keepTags.forEach(s => {
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
    filters.discardNames.forEach(s => {
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
    var rIndex = buildReverseIndex(canonical);

    // Issue Warnings
    var warnUncommon = [];
    var warnMatched = [];
    var warnDuplicate = [];
    var seen = {};

    Object.keys(canonical).forEach(k => {
        // Warn if the item is uncommon (i.e. not found in keepNames)
        if (!keep[k]) {
            delete canonical[k].count;
            if (!canonical[k].nocount) {   // suppress warning?
                warnUncommon.push(k);
            }
        } else {
            delete canonical[k].nocount;
        }

        // Warn if the item is found in rIndex (i.e. some other item matches it)
        if (rIndex[k]) {
            warnMatched.push([rIndex[k], k]);
        }

        // Warn if the item appears to be a duplicate (i.e. same name)
        var name = diacritics.remove(k.split('|', 2)[1].toLowerCase());
        var other = seen[name];
        if (other) {
            // suppress warning?
            var suppress = false;
            if (canonical[other].nomatch && canonical[other].nomatch.indexOf(k) !== -1) {
                suppress = true;
            } else if (canonical[k].nomatch && canonical[k].nomatch.indexOf(other) !== -1) {
                suppress = true;
            }
            if (!suppress) {
                warnDuplicate.push([k, other]);
            }
        }
        seen[name] = k;
    });

    if (warnMatched.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` matched to other entries in `canonical.json`:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        warnMatched.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
        ));
    }

    if (warnDuplicate.length) {
        console.warn(colors.yellow('\nWarning - Potential duplicate names in `canonical.json`:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        console.warn('To suppress this warning for entries that really are different, add a "nomatch" property on both entries.');
        warnDuplicate.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + colors.yellow('"' + w[1] + '"')
        ));
    }

    if (warnUncommon.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` not found in `keepNames.json`:'));
        console.warn('These might be okay. It just means that the entry is not commonly found in OpenStreetMap.');
        console.warn('To suppress this warning, add a "nocount" property to the entry.');
        warnUncommon.forEach(w => console.warn(
            colors.yellow('  "' + w + '"')
        ));
    }


    console.log('\nmerging config/canonical.json');
    console.time(colors.green('config updated'));

    // Create/update entries in `config/canonical.json`
    Object.keys(keep).forEach(k => {
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
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = obj[k];
    });
    return sorted;
}


function buildReverseIndex(obj) {
    var rIndex = {};
    var warnCollisions = [];

    for (var key in obj) {
        if (obj[key].match) {
            for (var i = obj[key].match.length - 1; i >= 0; i--) {
                var match = obj[key].match[i];
                if (rIndex[match]) {
                    warnCollisions.push([rIndex[match], match]);
                    warnCollisions.push([key, match]);
                }
                rIndex[match] = key;
            }
        }
    }

    if (warnCollisions.length) {
        console.warn(colors.yellow('\nWarning - match name collisions in `canonical.json`:'));
        console.warn('To resolve these, make sure multiple entries do not contain the same "match" property.');
        warnCollisions.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> match? -> ' + colors.yellow('"' + w[1] + '"')
        ));
    }

    return rIndex;
}

