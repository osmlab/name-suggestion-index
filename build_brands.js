const colors = require('colors/safe');
const diacritics = require('diacritics');
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
let _ambiguous = {};
let _matchIndex = {};


filterNames();
buildMatchIndex(brands);
checkBrands();
mergeBrands();
fileTree.write('brands', brands);



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
        for (let kvnd in _discard) {
            let tag = kvnd.split('|', 2)[0];
            if (re.test(tag)) {
                _keep[kvnd] = _discard[kvnd];
                delete _discard[kvnd];
            }
        }
    });

    // filter by discardKeys (move from _keep -> _discard)
    filters.discardKeys.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let kvnd in _keep) {
            if (re.test(kvnd)) {
                _discard[kvnd] = _keep[kvnd];
                delete _keep[kvnd];
            }
        }
    });

    // filter by discardNames (move from _keep -> _discard)
    filters.discardNames.forEach(s => {
        let re = new RegExp(s, 'i');
        for (let kvnd in _keep) {
            let name = kvnd.split('|', 2)[1];
            if (re.test(name)) {
                _discard[kvnd] = _keep[kvnd];
                delete _keep[kvnd];
            }
        }
    });

    fs.writeFileSync('dist/names_discard.json', stringify(sort(_discard)));
    fs.writeFileSync('dist/names_keep.json', stringify(sort(_keep)));
    console.timeEnd(colors.green('names filtered'));
}


//--------------BEGIN MATCHER  (to extract)

// remove spaces, punctuation, diacritics
function simplify(str) {
    return diacritics.remove(
        str.replace(/[\s\-=_!"#%&'*{},.\/:;?\(\)\[\]@\\$\^*+<>~`\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g,'')
            .toLowerCase()
    );
}

// toParts - split a name-suggestion-index key into parts
// {
//   kvnd:  "shop/department_store|Target~(USA)"
//   kvn:   "shop/department_store|Target"
//   kv:    "shop/department_store"
//   k:     "shop"
//   v:     "department_store"
//   n:     "Target"
//   d:     "(USA)"
// }
function toParts(kvnd) {
    let result = {};
    result.kvnd = kvnd;

    let kvndparts = kvnd.split('~', 2);
    if (kvndparts.length > 1) result.d = kvndparts[1];

    result.kvn = kvndparts[0];
    let kvnparts = result.kvn.split('|', 2);
    if (kvnparts.length > 1) result.n = kvnparts[1];

    result.kv = kvnparts[0];
    let kvparts = result.kv.split('/', 2);
    result.k = kvparts[0];
    result.v = kvparts[1];

    result.nsimple = simplify(result.n);
    result.kvnsimple = result.kv + '|' + result.nsimple;
    return result;
}


// Create an index of all the keys/simplenames for fast matching
function buildMatchIndex(brands) {
    Object.keys(brands).forEach(kvnd => {
        let obj = brands[kvnd];
        let parts = toParts(kvnd);

        let matchTags = (obj.matchTags || []).map(s => s.toLowerCase());
        let matchNames = (obj.matchNames || []).map(simplify);
        let nomatches = (obj.nomatch || []).map(kvnd => toParts(kvnd).kvnsimple);

        let match_kv = [parts.kv].concat(matchTags);
        let match_nsimple = [parts.nsimple].concat(matchNames);

        match_kv.forEach(kv => {
            match_nsimple.forEach(nsimple => {
                let test = `${kv}${nsimple}`;
                if (nomatches.some(s => s === test)) {
                    console.log(` WARNING match/nomatch conflict for ${test}!`);
                    return;
                }

                if (parts.d) {
                    if (!_ambiguous[kv]) _ambiguous[kv] = {};
                    _ambiguous[kv][nsimple] = parts.kvnsimple;
                } else {
                    if (!_matchIndex[kv]) _matchIndex[kv] = {};
                    _matchIndex[kv][nsimple] = parts.kvnsimple;
                }
            });
        });
    });
}


// pass a parts object
function matchKey(parts) {
    let results = new Set();
    let match = null;
    let inGroup = false;

    // we currently return a single garbage match for ambiguous
    match = _ambiguous[parts.kv] && _ambiguous[parts.kv][parts.nsimple];
    if (match) return match + '~?';

    // try to return an exact match
    match = _matchIndex[parts.kv] && _matchIndex[parts.kv][parts.nsimple];
    if (match) return match;

    // look in match groups
    for (let mg in matchGroups) {
        let matchGroup = matchGroups[mg];
        match = null;
        inGroup = false;

        for (let i = 0; i < matchGroup.length; i++) {
            let otherkv = matchGroup[i].toLowerCase();
            if (!inGroup) {
                inGroup = (otherkv === parts.kv);
            }
            if (!match) {
                // we currently return a single garbage match for ambiguous
                match = _ambiguous[otherkv] && _ambiguous[otherkv][parts.nsimple];
                if (match) match = match + '~?';
            }
            if (!match) {
                match = _matchIndex[otherkv] && _matchIndex[otherkv][parts.nsimple];
            }

            if (inGroup && match) {
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
    console.log('\nmerging brands');
    console.time(colors.green('brands merged'));

    // Create/update entries
    // First, entries in namesKeep (i.e. counted entries)
    Object.keys(_keep).forEach(kvnd => {
        let obj = brands[kvnd];
        let parts = toParts(kvnd);

        var m = matchKey(parts);
        if (m) return;  // already in the index

        if (!obj) {   // a new entry!
console.log(`new entry for ${kvnd}\n\n`);
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
    Object.keys(brands).forEach(kvnd => {
        let obj = brands[kvnd];
        let parts = toParts(kvnd);

        let key = parts.k;
        let value = parts.v;
        let name = parts.n;

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

        brands[kvnd] = sort(brands[kvnd])

     });

    console.timeEnd(colors.green('brands merged'));
}



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

    Object.keys(brands).forEach(kvnd => {
        let obj = brands[kvnd];
        let parts = kvnd.split('|', 2);
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
            if (brands[other].nomatch && brands[other].nomatch.indexOf(kvnd) !== -1) {
                suppress = true;
            } else if (obj.nomatch && obj.nomatch.indexOf(other) !== -1) {
                suppress = true;
            }
            if (!suppress) {
                warnDuplicate.push([kvnd, other]);
            }
        }
        seen[stem] = kvnd;


        // Warn if `brand:wikidata` or `brand:wikipedia` tags are missing or look wrong..
        let wd = obj.tags['brand:wikidata'];
        if (!wd) {
            warnMissingWikidata.push(kvnd);
        } else if (!/^Q\d+$/.test(wd)) {
            warnFormatWikidata.push([kvnd, wd]);
        }
        let wp = obj.tags['brand:wikipedia'];
        if (!wp) {
            warnMissingWikipedia.push(kvnd);
        } else if (!/^[a-z_]{2,}:[^_]*$/.test(wp)) {
            warnFormatWikipedia.push([kvnd, wp]);
        }

        // Warn on missing logo
        let logos = (wd && _wikidata[wd] && _wikidata[wd].logos) || {};
        if (!Object.keys(logos).length) {
            warnMissingLogos.push(kvnd);
        }

        // Warn on other missing tags
        switch (tag) {
            case 'amenity/fast_food':
            case 'amenity/restaurant':
                if (!obj.tags.cuisine) { warnMissingTag.push([kvnd, 'cuisine']); }
                break;
            case 'amenity/vending_machine':
                if (!obj.tags.vending) { warnMissingTag.push([kvnd, 'vending']); }
                break;
            case 'shop/beauty':
                if (!obj.tags.beauty) { warnMissingTag.push([kvnd, 'beauty']); }
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
