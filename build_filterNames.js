const colors = require('colors/safe');
const diacritics = require('diacritics');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const allNames = require('./dist/allNames.json');
const filters = require('./config/filters.json');
let canonical = require('./config/canonical.json');

// perform JSON-schema validation
const Validator = require('jsonschema').Validator;
const filtersSchema = require('./schema/filters.json');
const canonicalSchema = require('./schema/canonical.json');

validateSchema('config/filters.json', filters, filtersSchema);
validateSchema('config/canonical.json', canonical, canonicalSchema);


// all names start out in discard..
let discard = Object.assign({}, allNames);
let keep = {};
let rIndex = {};

filterNames();
mergeConfig();



// Perform JSON Schema validation
function validateSchema(fileName, object, schema) {
    let v = new Validator();
    let validationErrors = v.validate(object, schema).errors;
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
        let re = new RegExp(s, 'i');
        for (let key in discard) {
            let tag = key.split('|', 2)[0];
            if (re.test(tag)) {
                keep[key] = discard[key];
                delete discard[key];
            }
        }
    });

    // filter by discardKeys (move from keep -> discard)
    filters.discardKeys.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let key in keep) {
            if (re.test(key)) {
                discard[key] = keep[key];
                delete keep[key];
            }
        }
    });

    // filter by discardNames (move from keep -> discard)
    filters.discardNames.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let key in keep) {
            let name = key.split('|', 2)[1];
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

        let obj = canonical[k];
        let parts = k.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];
        let name = parts[1];

        if (!obj) {
            obj = { count: 0, tags: {} };
            obj.tags.name = name;
            obj.tags[key] = value;
        }

        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
            obj.countryCodes = ['il'];
        } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
            obj.countryCodes = ['th'];
        } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
            obj.countryCodes = ['mm'];
        } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
        } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
            obj.countryCodes = ['ph'];
        } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
            obj.countryCodes = ['jp'];
        } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
        } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
        } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
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
    let sorted = {};
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
}


//
// Returns a reverse index to map match keys back to their original keys
//
function buildReverseIndex() {
    let warnCollisions = [];

    for (let key in canonical) {
        if (canonical[key].match) {
            for (let i = canonical[key].match.length - 1; i >= 0; i--) {
                let match = canonical[key].match[i];
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
    let warnUncommon = [];
    let warnMatched = [];
    let warnDuplicate = [];
    let warnFormatWikidata = [];
    let warnFormatWikipedia = [];
    let warnMissingWikidata = [];
    let warnMissingWikipedia = [];
    let seen = {};

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
        let stem = stemmer(k.split('|', 2)[1]);
        let other = seen[stem];
        if (other) {
            // suppress warning?
            let suppress = false;
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


        // Warn if `brand:wikidata` or `brand:wikipedia` tags are missing or look wrong..
        let wd = canonical[k].tags['brand:wikidata'];
        if (!wd) {
            warnMissingWikidata.push(k);
        } else if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([k, wd]);
        }
        let wp = canonical[k].tags['brand:wikipedia'];
        if (!wp) {
            warnMissingWikipedia.push(k);
        } else if (!/^[a-z_]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([k, wp]);
        }
    });

    if (warnMatched.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` matched to other entries in `canonical.json`:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        warnMatched.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
        ));
        console.warn('total ' + warnMatched.length);
    }

    if (warnDuplicate.length) {
        console.warn(colors.yellow('\nWarning - Potential duplicate names in `canonical.json`:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        console.warn('To suppress this warning for entries that really are different, add a "nomatch" property on both entries.');
        warnDuplicate.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + colors.yellow('"' + w[1] + '"')
        ));
        console.warn('total ' + warnDuplicate.length);
    }

    if (warnUncommon.length) {
        console.warn(colors.yellow('\nWarning - Uncommon entries in `canonical.json` not found in `keepNames.json`:'));
        console.warn('These might be okay. It just means that the entry is not commonly found in OpenStreetMap.');
        console.warn('To suppress this warning, add a "nocount" property to the entry.');
        warnUncommon.forEach(w => console.warn(
            colors.yellow('  "' + w + '"')
        ));
        console.warn('total ' + warnUncommon.length);
    }

    // if (warnMissingWikidata.length) {
    //     console.warn(colors.yellow('\nWarning - Entries in `canonical.json` missing `brand:wikidata`:'));
    //     console.warn('To resolve these, make sure "brand:wikidata" tag looks like "Q191615".');
    //     warnMissingWikidata.forEach(w => console.warn(
    //         colors.yellow('  "' + w + '"') + ' -> missing -> "brand:wikidata"'
    //     ));
    //     console.warn('total ' + warnMissingWikidata.length);
    // }

    // if (warnMissingWikipedia.length) {
    //     console.warn(colors.yellow('\nWarning - Entries in `canonical.json` missing `brand:wikipedia`:'));
    //     console.warn('To resolve these, make sure "brand:wikipedia" tag looks like "en:Pizza Hut".');
    //     warnMissingWikipedia.forEach(w => console.warn(
    //         colors.yellow('  "' + w + '"') + ' -> missing -> "brand:wikipedia"'
    //     ));
    //     console.warn('total ' + warnMissingWikipedia.length);
    // }

    if (warnFormatWikidata.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` with incorrect `brand:wikidata` format:'));
        console.warn('To resolve these, make sure "brand:wikidata" tag looks like "Q191615".');
        warnFormatWikidata.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikidata": ' + '"' + w[1] + '"'
        ));
        console.warn('total ' + warnFormatWikidata.length);
    }

    if (warnFormatWikipedia.length) {
        console.warn(colors.yellow('\nWarning - Entries in `canonical.json` with incorrect `brand:wikipedia` format:'));
        console.warn('To resolve these, make sure "brand:wikipedia" tag looks like "en:Pizza Hut".');
        warnFormatWikipedia.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikipedia": ' + '"' + w[1] + '"'
        ));
        console.warn('total ' + warnFormatWikipedia.length);
    }


    let total = Object.keys(canonical).length;
    let hasWd = total - warnMissingWikidata.length;
    let pct = (hasWd * 100 / total).toFixed(1);
    console.info(colors.blue(`\nIndex completeness: ${hasWd}/${total} (${pct}%) matched to Wikidata `));
}


// Removes noise from the name so that we can compare
// similar names for catching duplicates.
function stemmer(name) {
    let noise = [
        /ban(k|c)(a|o)?/ig,
        /банк/ig,
        /coop/ig,
        /express/ig,
        /(gas|fuel)/ig,
        /wireless/ig,
        /(shop|store)/ig,
        /[.,\/#!$%\^&\*;:{}=\-_`~()]/g,
        /\s/g
    ];

    name = noise.reduce((acc, regex) => acc.replace(regex, ''), name);
    return diacritics.remove(name.toLowerCase());
}
