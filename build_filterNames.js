const colors = require('colors/safe');
const diacritics = require('diacritics');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const allNames = require('./dist/allNames.json');
const filters = require('./config/filters.json');
var canonical = require('./config/canonical.json');

// perform JSON-schema validation
const Validator = require('jsonschema').Validator;
const filtersSchema = require('./schema/filters.json');
const canonicalSchema = require('./schema/canonical.json');

validateSchema('config/filters.json', filters, filtersSchema);
validateSchema('config/canonical.json', canonical, canonicalSchema);


// all names start out in discard..
var discard = Object.assign({}, allNames);
var keep = {};
var rIndex = {};

filterNames();
mergeConfig();



// Perform JSON Schema validation
function validateSchema(fileName, object, schema) {
    var v = new Validator();
    var validationErrors = v.validate(object, schema).errors;
    if (validationErrors.length) {
        console.error(colors.red('\nError - Schema validation:'));
        console.error('  ' + colors.yellow(fileName + ': '));
        validationErrors.forEach(e => {
            if (e.property) {
                console.error('  ' + colors.yellow(e.property + ' ' + e.message));
            } else {
                console.error('  ' + colors.yellow(e));
            }
        });
        console.error();
        process.exit(1);
    }
}


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
    buildReverseIndex();
    checkCanonical();

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

    fs.writeFileSync('config/canonical.json', stringify(sort(canonical), { maxLength: 50 }));
    console.timeEnd(colors.green('config updated'));
}


//
// Returns an object with sorted keys and sorted values.
// (This is useful for file diffing)
//
function sort(obj) {
    var sorted = {};
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
}


//
// Returns a reverse index to map match keys back to their original keys
//
function buildReverseIndex() {
    var warnCollisions = [];

    for (var key in canonical) {
        if (canonical[key].match) {
            for (var i = canonical[key].match.length - 1; i >= 0; i--) {
                var match = canonical[key].match[i];
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
}


//
// Checks all the entries in `canonical.json` for several kinds of issues
//
function checkCanonical() {
    var warnUncommon = [];
    var warnMatched = [];
    var warnDuplicate = [];
    var warnWikidata = [];
    var warnWikipedia = [];
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

        // Warn if the name appears to be a duplicate
        var stem = stemmer(k.split('|', 2)[1]);
        var other = seen[stem];
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
        seen[stem] = k;


        // Warn if `brand:wikidata` or `brand:wikipedia` tags look wrong
        if (canonical[k].tags) {
            var wd = canonical[k].tags['brand:wikidata'];
            if (wd && !/^Q\d+$/.test(wd)) {
                warnWikidata.push([k, wd]);
            }
            var wp = canonical[k].tags['brand:wikipedia'];
            if (wp && !/^[a-z_]{2,}:[^_]*$/.test(wp)) {
                warnWikipedia.push([k, wp]);
            }
        }
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
        console.warn(colors.yellow('\nWarning - Uncommon entries in `canonical.json` not found in `keepNames.json`:'));
        console.warn('These might be okay. It just means that the entry is not commonly found in OpenStreetMap.');
        console.warn('To suppress this warning, add a "nocount" property to the entry.');
        warnUncommon.forEach(w => console.warn(
            colors.yellow('  "' + w + '"')
        ));
    }

    if (warnWikidata.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` with incorrect `brand:wikidata` format:'));
        console.warn('To resolve these, make sure "brand:wikidata" tag looks like "Q191615".');
        warnWikidata.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikidata": ' + '"' + w[1] + '"'
        ));
    }

    if (warnWikipedia.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` with incorrect `brand:wikipedia` format:'));
        console.warn('To resolve these, make sure "brand:wikipedia" tag looks like "en:Pizza Hut".');
        warnWikipedia.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikipedia": ' + '"' + w[1] + '"'
        ));
    }
}


// Removes noise from the name so that we can compare
// similar names for catching duplicates.
function stemmer(name) {
    var noise = [
        /ban(k|c)(a|o)?/i,
        /банк/i,
        /coop/i,
        /express/i,
        /(gas|fuel)/i,
        /\s/
    ];

    name = noise.reduce((acc, regex) => acc.replace(regex, ''), name);
    return diacritics.remove(name.toLowerCase());
}
