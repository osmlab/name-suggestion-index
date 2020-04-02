const colors = require('colors/safe');
const fs = require('fs');
const dissolved = require('./dist/dissolved.json');
const namesKeep = require('./dist/names_keep.json');
const packageJSON = require('./package.json');
const prettyStringify = require('json-stringify-pretty-compact');
const shell = require('shelljs');
const xmlbuilder2 = require('xmlbuilder2');

const fileTree = require('./lib/file_tree.js');
const toParts = require('./lib/to_parts.js');

let brands = fileTree.read('brands');
let out = {};

buildAll();


function buildAll() {
  const START = '🏗   ' + colors.yellow('Building data...');
  const END = '👍  ' + colors.green('data built');

  console.log('');
  console.log(START);
  console.time(END);


  // Start clean
  shell.rm('-f', [
    'dist/name-suggestions.*',
    'dist/taginfo.json',
    'dist/*.min.json'
  ]);

  // Copy some project config files into `/dist`
  shell.cp('-f', 'config/filters.json', 'dist/filters.json');
  shell.cp('-f', 'config/match_groups.json', 'dist/match_groups.json');

  // Write `brands.json` as a single file
  fs.writeFileSync('dist/brands.json', prettyStringify({ brands: brands }));

  buildJSON();
  buildXML();
  buildTaginfo();

  // Minify the json files
  let tasks = [
    minifyJSON('dist/brands.json', 'dist/brands.min.json'),
    minifyJSON('dist/dissolved.json', 'dist/dissolved.min.json'),
    minifyJSON('dist/filters.json', 'dist/filters.min.json'),
    minifyJSON('dist/match_groups.json', 'dist/match_groups.min.json'),
    minifyJSON('dist/name-suggestions.json', 'dist/name-suggestions.min.json'),
    minifyJSON('dist/names_all.json', 'dist/names_all.min.json'),
    minifyJSON('dist/names_discard.json', 'dist/names_discard.min.json'),
    minifyJSON('dist/names_keep.json', 'dist/names_keep.min.json'),
    minifyJSON('dist/taginfo.json', 'dist/taginfo.min.json'),
    minifyJSON('dist/wikidata.json', 'dist/wikidata.min.json')
  ];

  return Promise.all(tasks)
    .then(() => {
      console.timeEnd(END);
      console.log('');
    })
    .catch((err) => {
      console.error(err);
      console.log('');
      process.exit(1);
    });
}


function buildJSON() {
  Object.keys(brands).forEach(kvnd => {
    const obj = brands[kvnd];

    const wd = obj.tags['brand:wikidata'];
    if (!wd || !/^Q\d+$/.test(wd)) return;   // wikidata tag missing or looks wrong..

    if (dissolved[kvnd]) {
      return;   // brand does not exist anymore, so it should not be in the index
    }

    const parts = toParts(kvnd);
    const k = parts.k;
    const v = parts.v;
    const n = parts.n + (parts.d !== undefined ? ' ' + parts.d : "");

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
  fs.writeFileSync('dist/name-suggestions.json', prettyStringify(out));
}


function buildXML() {
  let root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  let presets = root.ele('presets')
    .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
    .att('author', 'Name Suggestion Index')
    .att('shortdescription', 'Name Suggestion Index')
    .att('description', packageJSON.description)
    .att('link', 'https://github.com/' + packageJSON.repository)
    .att('version', packageJSON.version);

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

  fs.writeFileSync('dist/name-suggestions.presets.xml', root.end({ prettyPrint: true }));
  fs.writeFileSync('dist/name-suggestions.presets.min.xml', root.end());
}


function buildTaginfo() {
  let taginfo = {
    'data_format': 1,
    'data_url': 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/dist/taginfo.json',
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical common brand names for OpenStreetMap',
      'project_url': 'https://github.com/osmlab/name-suggestion-index',
      'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/master/README.md',
      'icon_url': 'https://raw.githubusercontent.com/mapbox/maki/master/icons/fast-food-15.svg?sanitize=true',
      'contact_name': 'Bryan Housel',
      'contact_email': 'bhousel@gmail.com'
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

          let kv = k + '/' + v;
          items[kv] = { key: k };

          if (v !== '*') {
            items[kv].value = v;
          }
        }
      }
    }
  }

  taginfo.tags = Object.keys(items).sort().map(k => items[k]);
  fs.writeFileSync('dist/taginfo.json', prettyStringify(taginfo, { maxLength: 100 }));
}


function minifyJSON(inPath, outPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(inPath, 'utf8', (err, data) => {
      if (err) return reject(err);

      const minified = JSON.stringify(JSON.parse(data));
      fs.writeFile(outPath, minified, (err) => {
        if (err) return reject(err);
        resolve();
      });

    });
  });
}
