const colors = require('colors/safe');
const fs = require('fs-extra');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const fileTree = require('./lib/file_tree.js');
const matcher = require('./lib/matcher.js')();
const sort = require('./lib/sort.js');
const stemmer = require('./lib/stemmer.js');
const toParts = require('./lib/to_parts.js');
const validate = require('./lib/validate.js');


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


// Load and check brand files
let brands = fileTree.read('brands');

// all names start out in _discard..
const allnames = require('./dist/names_all.json');
let _discard = Object.assign({}, allnames);
let _keep = {};


filterNames();
matcher.buildMatchIndex(brands);
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

        var m = matcher.matchParts(parts);
        if (m) return;  // already in the index

        if (!obj) {   // a new entry!
            obj = { tags: {} };
            brands[kvnd] = obj;

            // assign default tags - new entries
            obj.tags.brand = parts.n;
            obj.tags.name = parts.n;
            obj.tags[parts.k] = parts.v;
        }
    });


    // now process all brands
    Object.keys(brands).forEach(kvnd => {
        let obj = brands[kvnd];
        let parts = toParts(kvnd);

        // assign default tags - new or existing entries
        if (parts.kv === 'amenity/cafe') {
            if (!obj.tags.takeaway) obj.tags.takeaway = 'yes';
            if (!obj.tags.cuisine) obj.tags.cuisine = 'coffee_shop';
        } else if (parts.kv === 'amenity/fast_food') {
            if (!obj.tags.takeaway) obj.tags.takeaway = 'yes';
        } else if (parts.kv === 'amenity/pharmacy') {
            if (!obj.tags.healthcare) obj.tags.healthcare = 'pharmacy';
        }

        // Force `countryCode`, and duplicate `name:xx` and `brand:xx` tags
        // if the name can only be reasonably read in one country.
        // https://www.regular-expressions.info/unicode.html
        if (/[\u0590-\u05FF]/.test(parts.n)) {          // Hebrew
            obj.countryCodes = ['il'];
            // note: old ISO 639-1 lang code for Hebrew was `iw`, now `he`
            if (obj.tags.name) { obj.tags['name:he'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:he'] = obj.tags.brand; }
        } else if (/[\u0E00-\u0E7F]/.test(parts.n)) {   // Thai
            obj.countryCodes = ['th'];
            if (obj.tags.name) { obj.tags['name:th'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:th'] = obj.tags.brand; }
        } else if (/[\u1000-\u109F]/.test(parts.n)) {   // Myanmar
            obj.countryCodes = ['mm'];
            if (obj.tags.name) { obj.tags['name:my'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:my'] = obj.tags.brand; }
        } else if (/[\u1100-\u11FF]/.test(parts.n)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\u1700-\u171F]/.test(parts.n)) {   // Tagalog
            obj.countryCodes = ['ph'];
            if (obj.tags.name) { obj.tags['name:tl'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:tl'] = obj.tags.brand; }
        } else if (/[\u3040-\u30FF]/.test(parts.n)) {   // Hirgana or Katakana
            obj.countryCodes = ['jp'];
            if (obj.tags.name) { obj.tags['name:ja'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ja'] = obj.tags.brand; }
        } else if (/[\u3130-\u318F]/.test(parts.n)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\uA960-\uA97F]/.test(parts.n)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        } else if (/[\uAC00-\uD7AF]/.test(parts.n)) {   // Hangul
            obj.countryCodes = ['kr'];
            if (obj.tags.name) { obj.tags['name:ko'] = obj.tags.name; }
            if (obj.tags.brand) { obj.tags['brand:ko'] = obj.tags.brand; }
        }

        brands[kvnd] = sort(brands[kvnd]);

     });

    console.timeEnd(colors.green('brands merged'));
}


//
// Checks all the brands for several kinds of issues
//
function checkBrands() {
    let warnMatched = matcher.getWarnings();
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
        let parts = toParts(kvnd);

        if (!parts.d) {  // ignore ambiguous entries for these
            // Warn if some other item matches this item
            var m = matcher.matchParts(parts);
            if (m && m.kvnd !== kvnd) {
                warnMatched.push([m.kvnd, kvnd]);
            }

            // Warn if the name appears to be a duplicate
            let stem = stemmer(parts.n);
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
        }


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
        switch (parts.kv) {
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

    if (warnMatched.length) {
        console.warn(colors.yellow('\nWarning - Brands matched to other brands:'));
        console.warn('To resolve these, check that "matchNames"/"matchTags" properties do not match to a real entry.');
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
        console.warn('To resolve these, remove the worse entry and add "matchNames"/"matchTags" properties on the better entry.');
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
