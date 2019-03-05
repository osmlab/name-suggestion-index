const colors = require('colors/safe');
const fileTree = require('./lib/file_tree');
const fs = require('fs-extra');
const glob = require('glob');
const shell = require('shelljs');
const sort = require('./lib/sort');
const stemmer = require('./lib/stemmer');
const stringify = require('json-stringify-pretty-compact');
const validate = require('./lib/validate');


// Load and check filters.json
let filters = require('./config/filters.json');
const filtersSchema = require('./schema/filters.json');
validate('config/filters.json', filters, filtersSchema);  // validate JSON-schema

// Lowercase and sort the filters for consistency
filters = {
    keepTags: filters.keepTags.map(s => s.toLowerCase()).sort(),
    discardKeys: filters.discardKeys.map(s => s.toLowerCase()).sort(),
    discardNames: filters.discardNames.map(s => s.toLowerCase()).sort()
};

fs.writeFileSync('config/filters.json', stringify(filters));


// Load and check brand files
let brands = fileTree.read('brands');

// all names start out in discard..
const allNames = require('./dist/allNames.json');
let discard = Object.assign({}, allNames);

let keep = {};
let rIndex = {};
let ambiguous = {};

filterNames();
mergeBrands();
fileTree.write('brands', brands);


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
    console.log('\nfiltering names');
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
// mergeBrands() takes the brand names we are keeping
// and updates the files under `/brands/**/*.json`
//
function mergeBrands() {
    buildReverseIndex(brands);
    checkBrands();

    console.log('\nmerging brands');
    console.time(colors.green('brands merged'));

    // Create/update entries
    Object.keys(keep).forEach(k => {
        if (rIndex[k] || ambiguous[k]) return;

        let obj = brands[k];
        let parts = k.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];
        let name = parts[1];

        if (!obj) {
            obj = { count: 0, tags: {} };
            obj.tags.name = name;
            obj.tags[key] = value;
            brands[k] = obj;
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
    });

    Object.keys(brands).forEach(k => { brands[k] = sort(brands[k]) });
    console.timeEnd(colors.green('brands merged'));
}


// Some keys contain a disambiguation mark:  "Eko~ca" vs "Eko~gr"
// If so, we save these in an `ambiguous` object for later use
function checkAmbiguous(k) {
    let i = k.indexOf('~');
    if (i !== -1) {
        let stem = k.substring(0, i);
        ambiguous[stem] = true;
        return true;
    }
    return false;
}


//
// Returns a reverse index to map match keys back to their original keys
//
function buildReverseIndex(obj) {
    let warnCollisions = [];

    for (let k in obj) {
        checkAmbiguous(k);

        if (obj[k].match) {
            for (let i = obj[k].match.length - 1; i >= 0; i--) {
                let match = obj[k].match[i];
                checkAmbiguous(match);

                if (rIndex[match]) {
                    warnCollisions.push([rIndex[match], match]);
                    warnCollisions.push([k, match]);
                }
                rIndex[match] = k;
            }
        }
    }

    if (warnCollisions.length) {
        console.warn(colors.yellow('\nWarning - match name collisions'));
        console.warn('To resolve these, make sure multiple entries do not contain the same "match" property.');
        warnCollisions.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> match? -> ' + colors.yellow('"' + w[1] + '"')
        ));
    }
}


//
// Checks all the brands for several kinds of issues
//
function checkBrands() {
    let warnUncommon = [];
    let warnMatched = [];
    let warnDuplicate = [];
    let warnFormatWikidata = [];
    let warnFormatWikipedia = [];
    let warnMissingWikidata = [];
    let warnMissingWikipedia = [];
    let warnMissingTag = [];
    let seen = {};

    Object.keys(brands).forEach(k => {
        let obj = brands[k];
        let parts = k.split('|', 2);
        let tag = parts[0];
        let name = parts[1];

        // Warn if the item is uncommon (i.e. not found in keepNames)
        if (!keep[k]) {
            delete obj.count;
            if (!obj.nocount) {   // suppress warning?
                warnUncommon.push(k);
            }
        } else {
            delete obj.nocount;
        }

        // Warn if the item is found in rIndex (i.e. some other item matches it)
        if (rIndex[k]) {
            warnMatched.push([rIndex[k], k]);
        }

        // Warn if the name appears to be a duplicate
        let stem = stemmer(name);
        let other = seen[stem];
        if (other) {
            // suppress warning?
            let suppress = false;
            if (brands[other].nomatch && brands[other].nomatch.indexOf(k) !== -1) {
                suppress = true;
            } else if (obj.nomatch && obj.nomatch.indexOf(other) !== -1) {
                suppress = true;
            }
            if (!suppress) {
                warnDuplicate.push([k, other]);
            }
        }
        seen[stem] = k;


        // Warn if `brand:wikidata` or `brand:wikipedia` tags are missing or look wrong..
        let wd = obj.tags['brand:wikidata'];
        if (!wd) {
            warnMissingWikidata.push(k);
        } else if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([k, wd]);
        }
        let wp = obj.tags['brand:wikipedia'];
        if (!wp) {
            warnMissingWikipedia.push(k);
        } else if (!/^[a-z_]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([k, wp]);
        }

        // Warn on other missing tags
        switch (tag) {
            case 'amenity/fast_food':
            case 'amenity/restaurant':
                if (!obj.tags.cuisine) {
                    warnMissingTag.push([k, 'cuisine']);
                }
                break;
            case 'amenity/vending_machine':
                if (!obj.tags.vending) {
                    warnMissingTag.push([k, 'vending']);
                }
                break;
        }
    });

    if (warnMatched.length) {
        console.warn(colors.yellow('\nWarning - Brands matched to other brands:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        warnMatched.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
        ));
        console.warn('total ' + warnMatched.length);
    }

    if (warnMissingTag.length) {
        console.warn(colors.yellow('\nWarning - Missing tags for brands:'));
        console.warn('To resolve these, add the missing tag.');
        warnMissingTag.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> missing tag? -> ' + colors.yellow('"' + w[1] + '"')
        ));
        console.warn('total ' + warnMissingTag.length);
    }

    if (warnDuplicate.length) {
        console.warn(colors.yellow('\nWarning - Potential duplicate brand names:'));
        console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
        console.warn('To suppress this warning for entries that really are different, add a "nomatch" property on both entries.');
        warnDuplicate.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> duplicates? -> ' + colors.yellow('"' + w[1] + '"')
        ));
        console.warn('total ' + warnDuplicate.length);
    }

    if (warnUncommon.length) {
        console.warn(colors.yellow('\nWarning - Uncommon brand not found in `keepNames.json`:'));
        console.warn('These might be okay. It just means that the entry is not commonly found in OpenStreetMap.');
        console.warn('To suppress this warning, add a "nocount" property to the entry.');
        warnUncommon.forEach(w => console.warn(
            colors.yellow('  "' + w + '"')
        ));
        console.warn('total ' + warnUncommon.length);
    }

    // if (warnMissingWikidata.length) {
    //     console.warn(colors.yellow('\nWarning - Brand missing `brand:wikidata`:'));
    //     console.warn('To resolve these, make sure "brand:wikidata" tag looks like "Q191615".');
    //     warnMissingWikidata.forEach(w => console.warn(
    //         colors.yellow('  "' + w + '"') + ' -> missing -> "brand:wikidata"'
    //     ));
    //     console.warn('total ' + warnMissingWikidata.length);
    // }

    // if (warnMissingWikipedia.length) {
    //     console.warn(colors.yellow('\nWarning - Brand missing `brand:wikipedia`:'));
    //     console.warn('To resolve these, make sure "brand:wikipedia" tag looks like "en:Pizza Hut".');
    //     warnMissingWikipedia.forEach(w => console.warn(
    //         colors.yellow('  "' + w + '"') + ' -> missing -> "brand:wikipedia"'
    //     ));
    //     console.warn('total ' + warnMissingWikipedia.length);
    // }

    if (warnFormatWikidata.length) {
        console.warn(colors.yellow('\nWarning - Brand with incorrect `brand:wikidata` format:'));
        console.warn('To resolve these, make sure "brand:wikidata" tag looks like "Q191615".');
        warnFormatWikidata.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikidata": ' + '"' + w[1] + '"'
        ));
        console.warn('total ' + warnFormatWikidata.length);
    }

    if (warnFormatWikipedia.length) {
        console.warn(colors.yellow('\nWarning - Brand with incorrect `brand:wikipedia` format:'));
        console.warn('To resolve these, make sure "brand:wikipedia" tag looks like "en:Pizza Hut".');
        warnFormatWikipedia.forEach(w => console.warn(
            colors.yellow('  "' + w[0] + '"') + ' -> "brand:wikipedia": ' + '"' + w[1] + '"'
        ));
        console.warn('total ' + warnFormatWikipedia.length);
    }

    let total = Object.keys(brands).length;
    let hasWd = total - warnMissingWikidata.length;
    let pct = (hasWd * 100 / total).toFixed(1);
    console.info(colors.blue(`\nIndex completeness: ${hasWd}/${total} (${pct}%) matched to Wikidata `));
}
