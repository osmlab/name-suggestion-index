const colors = require('colors/safe');
const diacritics = require('diacritics');
const fileTree = require('./lib/file_tree');
const fs = require('fs');
const namesKeep = require('./dist/names_keep.json');
const package = require('./package.json');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');
const xmlbuilder = require('xmlbuilder');

let brands = fileTree.read('brands');
let out = {};

buildAll();


function buildAll() {
    console.log('building data');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/name-suggestions.*', 'dist/taginfo.json']);

    // copy `filters.json`
    shell.cp('-f', 'config/filters.json', 'dist/filters.json');

    // write `brands.json` as a single file
    fs.writeFileSync('dist/brands.json', stringify({ brands: brands }));

    buildJSON();
    buildXML();
    buildTaginfo();

    console.timeEnd(colors.green('data built'));
}


function buildJSON() {
    Object.keys(brands).forEach(kvnd => {
        const obj = brands[kvnd];

        const wd = obj.tags['brand:wikidata'];
        if (!wd || !/^Q\d+$/.test(wd)) return;   // wikidata tag missing or looks wrong..

        const parts = toParts(kvnd);
        const k = parts.k;
        const v = parts.v;
        const n = parts.n + ' ' + parts.d;

        if (!out[k])    out[k] = {};
        if (!out[k][v]) out[k][v] = {};
        out[k][v][n] = {};

        if (namesKeep[kvnd]) {
            out[k][v][n].count = namesKeep[kvnd];
        }

        if (obj.countryCodes) {
            out[k][v][n].countryCodes = obj.countryCodes;
        }

        out[k][v][n].tags = obj.tags;
    });

    // Save individual data files
    fs.writeFileSync('dist/name-suggestions.json', stringify(out));
    fs.writeFileSync('dist/name-suggestions.min.json', JSON.stringify(out));
}


function buildXML() {
    let presets = xmlbuilder
        .create('presets', { version: '1.0', encoding: 'UTF-8' })
        .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
        .att('author', 'Name Suggestion Index')
        .att('shortdescription', 'Name Suggestion Index')
        .att('description', package.description)
        .att('link', 'https://github.com/' + package.repository)
        .att('version', package.version);

    let topgroup = presets
        .ele('group')
        .att('name', 'Name Suggestion Index');

    // Create JOSM presets using the key and value structure from the json
    // to organize the presets into JOSM preset groups.
    for (let key in out) {
        let keygroup = topgroup.ele('group').att('name', key);

        for (let value in out[key]) {
            let valuegroup = keygroup.ele('group').att('name', value);

            for (let name in out[key][value]) {
                let item = valuegroup
                    .ele('item')
                    .att('name', name)
                    .att('type', 'node,closedway,multipolygon');

                let tags = out[key][value][name].tags;
                for (let k in tags) {
                    item.ele('key').att('key', k).att('value', tags[k]);
                }
            }
        }
    }

    let xmlstring = presets.end({ pretty: true })
    fs.writeFileSync('dist/name-suggestions.presets.xml', xmlstring);
}


function buildTaginfo() {
    var taginfo = {
        'data_format': 1,
        'data_url': 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/dist/taginfo.json',
        'project': {
            'name': 'name-suggestion-index',
            'description': 'Canonical common brand names for OpenStreetMap',
            'project_url': 'https://github.com/osmlab/name-suggestion-index',
            'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/master/README.md',
            'icon_url': 'https://raw.githubusercontent.com/mapbox/maki/master/icons/fast-food-15.svg?sanitize=true',
            'contact_name': 'Bryan Housel',
            'contact_email': 'bryan@mapbox.com'
        }
    };

    let items = {};
    for (let key in out) {
        for (let value in out[key]) {
            for (let name in out[key][value]) {
                let tags = out[key][value][name].tags;
                for (let k in tags) {
                    let v = tags[k];

                    // skip value for most tags this project uses
                    if (/name|brand|operator/.test(k)) {
                        v = '*';
                    }

                    let id = k + '/' + v;
                    items[id] = { key: k }

                    if (v !== '*') {
                        items[id].value = v;
                    }
               }
            }
        }
    }

    taginfo.tags = Object.keys(items).sort().map(k => items[k]);
    fs.writeFileSync('dist/taginfo.json', stringify(taginfo, { maxLength: 100 }));
}


//-------------- (todo extract to /lib)

// remove spaces, punctuation, diacritics
function simplify(str) {
    return diacritics.remove(
        str.replace(/[\s\-=_!"#%&'*{},.\/:;?\(\)\[\]@\\$\^*+<>~`’\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g,'')
            .toLowerCase()
    );
}

// toParts - split a name-suggestion-index key into parts
// {
//   kvnd:        "amenity/fast_food|Thaï Express~(North America)",
//   kvn:         "amenity/fast_food|Thaï Express",
//   kv:          "amenity/fast_food",
//   k:           "amenity",
//   v:           "fast_food",
//   n:           "Thaï Express",
//   d:           "(North America)",
//   nsimple:     "thaiexpress",
//   kvnnsimple:  "amenity/fast_food|thaiexpress"
// }
function toParts(kvnd) {
    let parts = {};
    parts.kvnd = kvnd;

    let kvndparts = kvnd.split('~', 2);
    if (kvndparts.length > 1) parts.d = kvndparts[1];

    parts.kvn = kvndparts[0];
    let kvnparts = parts.kvn.split('|', 2);
    if (kvnparts.length > 1) parts.n = kvnparts[1];

    parts.kv = kvnparts[0];
    let kvparts = parts.kv.split('/', 2);
    parts.k = kvparts[0];
    parts.v = kvparts[1];

    parts.nsimple = simplify(parts.n);
    parts.kvnsimple = parts.kv + '|' + parts.nsimple;
    return parts;
}
