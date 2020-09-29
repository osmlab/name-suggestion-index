const colors = require('colors/safe');
const fs = require('fs');
const dissolved = require('../dist/dissolved.json');
const fileTree = require('../lib/file_tree.js');
const namesKeep = require('../dist/filtered/names_keep.json');
const packageJSON = require('../package.json');
const prettyStringify = require('json-stringify-pretty-compact');
const shell = require('shelljs');
const xmlbuilder2 = require('xmlbuilder2');

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);


let _cache = { path: {}, id: {} };
fileTree.read('brands', _cache, loco);
let _nameSuggestions = {};

buildAll();


function buildAll() {
  const START = '🏗   ' + colors.yellow('Building data...');
  const END = '👍  ' + colors.green('data built');

  console.log('');
  console.log(START);
  console.time(END);


  // Start clean
  shell.rm('-f', [
    'docs/sitemap.xml',
    'dist/name-suggestions.*',
    'dist/taginfo.json',
    'dist/*.min.json',
    'dist/collected/*.min.json',
    'dist/filtered/*.min.json'
  ]);

  // Copy some project config files into `/dist`
  shell.cp('-f', 'config/brand_filters.json', 'dist/brand_filters.json');
  shell.cp('-f', 'config/match_groups.json', 'dist/match_groups.json');

  // Write `brands.json` as a single file containing everything by path
  fs.writeFileSync('dist/brands.json', prettyStringify(_cache.path));

  buildJSON();
  buildXML();
  buildTaginfo();
  buildSitemap();

  // Minify the json files
  let tasks = [
    minifyJSON('dist/brands.json', 'dist/brands.min.json'),
    minifyJSON('dist/dissolved.json', 'dist/dissolved.min.json'),
    minifyJSON('dist/featureCollection.json', 'dist/featureCollection.min.json'),
    minifyJSON('dist/brand_filters.json', 'dist/brand_filters.min.json'),
    minifyJSON('dist/match_groups.json', 'dist/match_groups.min.json'),
    minifyJSON('dist/name-suggestions.json', 'dist/name-suggestions.min.json'),
    minifyJSON('dist/collected/names_all.json', 'dist/collected/names_all.min.json'),
    minifyJSON('dist/filtered/names_discard.json', 'dist/filtered/names_discard.min.json'),
    minifyJSON('dist/filtered/names_keep.json', 'dist/filtered/names_keep.min.json'),
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
  // for now, process `brands/*` only
  const paths = Object.keys(_cache.path).filter(tkv => tkv.split('/')[0] === 'brands');

  paths.forEach(tkv => {
    let items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const k = parts[1];
    const v = parts[2];

    items.forEach(item => {
      const wd = item.tags['brand:wikidata'];
      if (!wd || !/^Q\d+$/.test(wd)) return;   // wikidata tag missing or looks wrong..
      if (dissolved[item.id]) return;          // dissolved/closed businesses

      const n = item.displayName;
      const kvn = `${k}/${v}|${n}`;

      if (!_nameSuggestions[k])     _nameSuggestions[k] = {};
      if (!_nameSuggestions[k][v])  _nameSuggestions[k][v] = {};
      _nameSuggestions[k][v][n] = {};

      if (namesKeep[kvn]) {
        _nameSuggestions[k][v][n].count = namesKeep[kvn];
      }

      _nameSuggestions[k][v][n].id = item.id;
      _nameSuggestions[k][v][n].locationSet = item.locationSet;
      _nameSuggestions[k][v][n].tags = item.tags;
    });
  });

  // Save individual data files
  fs.writeFileSync('dist/name-suggestions.json', prettyStringify(_nameSuggestions));
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
  for (const key in _nameSuggestions) {
    let keygroup = topgroup.ele('group').att('name', key);

    for (const value in _nameSuggestions[key]) {
      let valuegroup = keygroup.ele('group').att('name', value);

      for (const displayName in _nameSuggestions[key][value]) {
        let item = valuegroup
          .ele('item')
          .att('name', displayName)
          .att('type', 'node,closedway,multipolygon');

        const tags = _nameSuggestions[key][value][displayName].tags;
        for (const k in tags) {
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
    'data_url': 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist/taginfo.json',
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical common brand names for OpenStreetMap',
      'project_url': 'https://github.com/osmlab/name-suggestion-index',
      'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/main/README.md',
      'icon_url': 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/fastr-food-15.svg',
      'contact_name': 'Bryan Housel',
      'contact_email': 'bhousel@gmail.com'
    }
  };

  // collect all tag pairs
  let tagPairs = {};
  Object.values(_cache.id).filter(item => {
    for (const k in item.tags) {
      let v = item.tags[k];

      // skip value for many tags this project uses..
      if (/name|brand|network|operator/.test(k)) {
        v = '*';
      }

      const kv = `${k}/${v}`;
      tagPairs[kv] = { key: k };

      if (v !== '*') {
        tagPairs[kv].value = v;
      }
    }
  });

  taginfo.tags = Object.keys(tagPairs).sort().map(kv => tagPairs[kv]);
  fs.writeFileSync('dist/taginfo.json', prettyStringify(taginfo, { maxLength: 100 }));
}


function buildSitemap() {
  const changefreq = 'weekly';
  const lastmod = (new Date()).toISOString();

  let root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  let urlset = root.ele('urlset').att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

  let index = urlset.ele('url');
  index.ele('loc').txt('https://nsi.guide/index.html');
  index.ele('changefreq').txt(changefreq);
  index.ele('lastmod').txt(lastmod);

  // collect all paths
  Object.keys(_cache.path).filter(tkv => {
    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];

    let url = urlset.ele('url');
    url.ele('loc').txt(`https://nsi.guide/index.html?t=${t}&k=${k}&v=${v}`);
    url.ele('changefreq').txt(changefreq);
    url.ele('lastmod').txt(lastmod);
  });

  fs.writeFileSync('docs/sitemap.xml', root.end({ prettyPrint: true }));
}


function minifyJSON(inPath, _nameSuggestionsPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(inPath, 'utf8', (err, data) => {
      if (err) return reject(err);

      const minified = JSON.stringify(JSON.parse(data));
      fs.writeFile(_nameSuggestionsPath, minified, (err) => {
        if (err) return reject(err);
        resolve();
      });

    });
  });
}
