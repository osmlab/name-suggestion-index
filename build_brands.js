const colors = require('colors/safe');
const fileTree = require('./lib/file_tree');
const fs = require('fs-extra');
const glob = require('glob');
const shell = require('shelljs');
const sort = require('./lib/sort');
const stemmer = require('./lib/stemmer');
const stringify = require('json-stringify-pretty-compact');
const validate = require('./lib/validate');


// Load cached wikidata
const _wikidata = require('./dist/wikidata.json').wikidata;

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


// Load and check matchGroups.json
const matchGroups = require('./config/matchGroups.json').matchGroups;

// Load and check brand files
let brands = fileTree.read('brands');

// all names start out in _discard..
const allnames = require('./dist/names_all.json');
let _discard = Object.assign({}, allnames);

let _keep = {};
// let rIndex = {};
let _ambiguousKeys = {};
let _matchIndex = {};

filterNames();
mergeBrands();
fileTree.write('brands', brands);


// In this file, we use `kvn` to refer to a name-suggestion-index key
// `key/value|name`

//
// `filterNames()` will process a `dist/names_all.json` file,
// splitting the data up into 2 files:
//
// `dist/names_keep.json` - candidates for suggestion presets
// `dist/names_discard.json` - everything else
//
// The file format is identical to the `names_all.json` file:
// "key/value|name": count
// "shop/coffee|Starbucks": 8284
//
function filterNames() {
    console.log('\nfiltering names');
    console.time(colors.green('names filtered'));

    // Start clean
    shell.rm('-f', ['dist/names_keep.json', 'dist/names_discard.json']);

    // filter by keepTags (move from _discard -> _keep)
    filters.keepTags.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let kvn in _discard) {
            let tag = kvn.split('|', 2)[0];
            if (re.test(tag)) {
                _keep[kvn] = _discard[kvn];
                delete _discard[kvn];
            }
        }
    });

    // filter by discardKeys (move from _keep -> _discard)
    filters.discardKeys.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let kvn in _keep) {
            if (re.test(kvn)) {
                _discard[kvn] = _keep[kvn];
                delete _keep[kvn];
            }
        }
    });

    // filter by discardNames (move from _keep -> _discard)
    filters.discardNames.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let kvn in _keep) {
            let name = kvn.split('|', 2)[1];
            if (re.test(name)) {
                _discard[kvn] = _keep[kvn];
                delete _keep[kvn];
            }
        }
    });

    fs.writeFileSync('dist/names_discard.json', stringify(sort(_discard)));
    fs.writeFileSync('dist/names_keep.json', stringify(sort(_keep)));
    console.timeEnd(colors.green('names filtered'));
}


//--------------BEGIN MATCHER  (to extract)


// Some keys contain a disambiguation mark:
//    "amenity/fuel|EKO~(Canada)" vs "amenity/fuel|EKO~(Greece)"
// If so, we save these in an `_ambiguousKeys` object for later use
// Note that kvn is lowercase and we do case insensitive compares
function checkAmbiguous(kvnlower) {
    let i = kvnlower.indexOf('~');
    if (i !== -1) {
        let stem = kvnlower.substring(0, i);
        _ambiguousKeys[stem] = true;
        return true;
    }
    return false;
}

// Create an index of all the names -> kvn for fast matching
// Note that kvn is lowercase and we do case insensitive compares
function buildMatchIndex(brands) {
    Object.keys(brands).forEach(kvn => {
        let obj = brands[kvn];

        let kvnlower = kvn.toLowerCase();
        if (checkAmbiguous(kvnlower)) return;

        let parts = kvnlower.split('|', 2);
        let match_kv = [parts[0]].concat(obj.matchTags || []);
        let match_n = [parts[1]].concat(obj.matchNames || []);
        let nomatches = (obj.nomatch || []).map(s => s.toLowerCase());

        match_kv.forEach(kv => {
            match_n.forEach(n => {
                if (nomatches.some(s => s === `{kv}{n}`)) return;  // should prob be a warning
                if (!_matchIndex[kv]) {
                    _matchIndex[kv] = {};
                }
                _matchIndex[kv][n] = kvnlower;
            });
        });
    });
}

// pass key/value|name
function matchKey(kvn) {
    let kvnlower = kvn.toLowerCase();
    let kvnparts = kvnlower.split('|', 2);
    let kv = kvnparts[0];
    let n = kvnparts[1];

    // try to return an exact match
    let match = _matchIndex[kv][n];
    if (match) return match;

    let kvparts = kv.split('/', 2);
    let k = kvparts[0];
    let v = kvparts[1];

    // look in match groups
    for (let mgkey in matchGroups) {
        let matchGroup = matchGroups[mgkey];
        let match = null;
        let inGroup = false;

        for (let i = 0; i < matchGroup.length; i++) {
            let otherkv = matchGroup[i].toLowerCase();
            if (!inGroup) {
                inGroup = (otherkv === kv);
            }
            if (!match) {
                match = _matchIndex[otherkv] && _matchIndex[otherkv][n];
            }
            if (match && inGroup) {
                return match;
            }
        }
    }

    return null;
}

//-------------- END MATCHER  (to extract)



//
// mergeBrands() takes the brand names we are keeping
// and updates the files under `/brands/**/*.json`
//
function mergeBrands() {
    // buildReverseIndex(brands);
    buildMatchIndex(brands);
    checkBrands();

    console.log('\nmerging brands');
    console.time(colors.green('brands merged'));

    // Create/update entries
    // First, entries in namesKeep (i.e. counted entries)
    Object.keys(_keep).forEach(kvn => {
// console.log(`check ${kvn}`);
        let kvnlower = kvn.toLowerCase();
        if (_ambiguousKeys[kvnlower]) return;    // don't touch these

        var mkvn = matchKey(kvnlower);
// console.log(`kvnlower = ${kvnlower}     mkvn = ${mkvn}`);
        if (mkvn) return;  // already in the index

        let obj = brands[kvn];
        let parts = kvn.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];
        let name = parts[1];

        if (!obj) {   // a new entry!
console.log(`new entry for ${kvn}\n\n`);
// out for now until we replace rindex
    //         obj = { tags: {} };
    //         brands[k] = obj;

    //         // assign default tags - new entries
    //         obj.tags.brand = name;
    //         obj.tags.name = name;
    //         obj.tags[key] = value;
        }
    });


    // now process all brands
    Object.keys(brands).forEach(kvn => {
        let obj = brands[kvn];
        let parts = kvn.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];
        let name = parts[1];


//--------------
// is this tag in a matchgroup?
// each map group is an equivalence class for tag matching
// let matchGroup;
// for (let mgkey in matchGroups) {
//     let group = matchGroups[mgkey];
//     if (group.some(t => t === parts[0])) {
//         matchGroup = group;
//         break;
//     }
// }

//--------------
// rewrite `match`
// let matchNames = new Set();
// let matchTags = new Set();
// delete obj.matchNames;
// delete obj.matchTags;

// let match = obj.match || [];
// match.forEach(mk => {
//     let mparts = mk.split('|', 2);
//     let mname = mparts[1].toLowerCase();

//     if (mname !== name.toLowerCase()) {
//         matchNames.add(mname);
//     }
//     if (mparts[0] !== parts[0]) {
//         if (!matchGroup || !matchGroup.some(val => val === mparts[0])) {
//             matchTags.add(mparts[0]);
//         }
//     }
// });
// if (matchNames.size) obj.matchNames = Array.from(matchNames);
// if (matchTags.size) obj.matchTags = Array.from(matchTags);
// delete obj.match;  // bye
//--------------

        // assign default tags - new or existing entries
        if (key === 'amenity' && value === 'cafe') {
            if (!obj.tags.takeaway) obj.tags.takeaway = 'yes';
            if (!obj.tags.cuisine) obj.tags.cuisine = 'coffee_shop';
        } else if (key === 'amenity' && value === 'fast_food') {
            if (!obj.tags.takeaway) obj.tags.takeaway = 'yes';
        } else if (key === 'amenity' && value === 'pharmacy') {
            if (!obj.tags.healthcare) obj.tags.healthcare = 'pharmacy';
        }

        // Force `countryCode`, and duplicate `name:xx` and `brand:xx` tags
        // if the name can only be reasonably read in one country.
        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(name)) {          // Hebrew
            obj.countryCodes = ['il'];
            // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
            if (obj.tags.name) { obj.tags['name:he'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:he'] = obj.tags.brand; }
        } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
            obj.countryCodes = ['th'];
            if (obj.tags.name) { obj.tags['name:th'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:th'] = obj.tags.brand; }
        } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
            obj.countryCodes = ['mm'];
            if (obj.tags.name) { obj.tags['name:my'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:my'] = obj.tags.brand; }
        } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
            obj.countryCodes = ['ph'];
            if (obj.tags.name) { obj.tags['name:tl'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:tl'] = obj.tags.brand; }
        } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
            obj.countryCodes = ['jp'];
            if (obj.tags.name) { obj.tags['name:ja'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ja'] = obj.tags.brand; }
        } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        }

        brands[kvn] = sort(brands[kvn])

     });

    console.timeEnd(colors.green('brands merged'));
}



// //
// // Returns a reverse index to map match keys back to their original keys
// //
// function buildReverseIndex(obj) {
//     let warnCollisions = [];

//     for (let k in obj) {
//         checkAmbiguous(k);

//         if (obj[k].match) {
//             for (let i = obj[k].match.length - 1; i >= 0; i--) {
//                 let match = obj[k].match[i];
//                 checkAmbiguous(match);

//                 if (rIndex[match]) {
//                     warnCollisions.push([rIndex[match], match]);
//                     warnCollisions.push([k, match]);
//                 }
//                 rIndex[match] = k;
//             }
//         }
//     }

//     if (warnCollisions.length) {
//         console.warn(colors.yellow('\nWarning - match name collisions'));
//         console.warn('To resolve these, make sure multiple entries do not contain the same "match" property.');
//         warnCollisions.forEach(w => console.warn(
//             colors.yellow('  "' + w[0] + '"') + ' -> match? -> ' + colors.yellow('"' + w[1] + '"')
//         ));
//     }
// }


//
// Checks all the brands for several kinds of issues
//
function checkBrands() {
    // let warnMatched = [];
    let warnDuplicate = [];
    let warnFormatWikidata = [];
    let warnFormatWikipedia = [];
    let warnMissingWikidata = [];
    let warnMissingWikipedia = [];
    let warnMissingLogos = [];
    let warnMissingTag = [];
    let seen = {};

    Object.keys(brands).forEach(kvn => {
        let obj = brands[kvn];
        let parts = kvn.split('|', 2);
        let tag = parts[0];
        let name = parts[1];

        // // Warn if the item is found in rIndex (i.e. some other item matches it)
        // if (rIndex[k]) {
        //     warnMatched.push([rIndex[k], k]);
        // }

        // Warn if the name appears to be a duplicate
        let stem = stemmer(name);
        let other = seen[stem];
        if (other) {
            // suppress warning?
            let suppress = false;
            if (brands[other].nomatch && brands[other].nomatch.indexOf(kvn) !== -1) {
                suppress = true;
            } else if (obj.nomatch && obj.nomatch.indexOf(other) !== -1) {
                suppress = true;
            }
            if (!suppress) {
                warnDuplicate.push([kvn, other]);
            }
        }
        seen[stem] = kvn;


        // Warn if `brand:wikidata` or `brand:wikipedia` tags are missing or look wrong..
        let wd = obj.tags['brand:wikidata'];
        if (!wd) {
            warnMissingWikidata.push(kvn);
        } else if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([kvn, wd]);
        }
        let wp = obj.tags['brand:wikipedia'];
        if (!wp) {
            warnMissingWikipedia.push(kvn);
        } else if (!/^[a-z_]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([kvn, wp]);
        }

        // Warn on missing logo
        let logos = (wd && _wikidata[wd] && _wikidata[wd].logos) || {};
        if (!Object.keys(logos).length) {
            warnMissingLogos.push(kvn);
        }

        // Warn on other missing tags
        switch (tag) {
            case 'amenity/fast_food':
            case 'amenity/restaurant':
                if (!obj.tags.cuisine) { warnMissingTag.push([kvn, 'cuisine']); }
                break;
            case 'amenity/vending_machine':
                if (!obj.tags.vending) { warnMissingTag.push([kvn, 'vending']); }
                break;
            case 'shop/beauty':
                if (!obj.tags.beauty) { warnMissingTag.push([kvn, 'beauty']); }
                break;
        }
    });

    // if (warnMatched.length) {
    //     console.warn(colors.yellow('\nWarning - Brands matched to other brands:'));
    //     console.warn('To resolve these, remove the worse entry and add "match" property on the better entry.');
    //     warnMatched.forEach(w => console.warn(
    //         colors.yellow('  "' + w[0] + '"') + ' -> matches? -> ' + colors.yellow('"' + w[1] + '"')
    //     ));
    //     console.warn('total ' + warnMatched.length);
    // }

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

    // if (warnMissingLogos.length) {
    //     console.warn(colors.yellow('\nWarning - Brand missing `logos`:'));
    //     console.warn('To resolve these, update the brands' entries on wikidata.org, then `npm run wikidata`.');
    //     warnMissingLogos.forEach(w => console.warn(
    //         colors.yellow('  "' + w + '"') + ' -> missing -> "logos"'
    //     ));
    //     console.warn('total ' + warnMissingLogos.length);
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
    let pctWd = (hasWd * 100 / total).toFixed(1);
    let hasLogos = total - warnMissingLogos.length;
    let pctLogos = (hasLogos * 100 / total).toFixed(1);
    console.info(colors.blue.bold(`\nIndex completeness:`));
    console.info(colors.blue.bold(`  ${total} entries total.`));
    console.info(colors.blue.bold(`  ${hasWd} (${pctWd}%) with a 'brand:wikidata' tag.`));
    console.info(colors.blue.bold(`  ${hasLogos} (${pctLogos}%) with a logo.`));
}
