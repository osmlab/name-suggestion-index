const colors = require('colors/safe');
const fs = require('fs');
const glob = require('glob');
const dissolved = require('../dist/dissolved.json');
const fileTree = require('../lib/file_tree.js');
const JSON5 = require('json5');
const brandsKeep = require('../dist/filtered/brands_keep.json');
const packageJSON = require('../package.json');
const prettyStringify = require('json-stringify-pretty-compact');
const shell = require('shelljs');
const sort = require('../lib/sort.js');
const xmlbuilder2 = require('xmlbuilder2');

// metadata about the trees
const trees = require('../config/trees.json').trees;

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);


let _cache = {};
fileTree.read(_cache, loco);
fileTree.expandTemplates(_cache, loco);
_cache.path = sort(_cache.path);

let _presetData = {};
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
    'dist/index.json',
    'dist/taginfo.json',
    'dist/presets/*',
    'dist/*.min.json',
    'dist/collected/*.min.json',
    'dist/filtered/*.min.json'
  ]);

  // Copy some project config files into `/dist`
  shell.cp('-f', 'config/genericWords.json', 'dist/genericWords.json');
  shell.cp('-f', 'config/match_groups.json', 'dist/match_groups.json');
  shell.cp('-f', 'config/replacements.json', 'dist/replacements.json');
  shell.cp('-f', 'config/trees.json', 'dist/trees.json');

  // Write `index.json` as a single file containing everything by path
  fs.writeFileSync('dist/index.json', prettyStringify(_cache.path, { maxLength: 800 }));

  buildJSON();
  buildXML();
  buildTaginfo();
  buildSitemap();

  // minify all .json files under dist/
  glob.sync(`dist/**/*.json`).forEach(file => {
    const minFile = file.replace('.json', '.min.json');
    minifySync(file, minFile);
  });
}


function buildJSON() {
  const paths = Object.keys(_cache.path);

  paths.sort().forEach(tkv => {
    let items = _cache.path[tkv];
    if (!Array.isArray(items) || !items.length) return;

    const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];

    // Which tag is considered the "main" tag for this tree?
    const wdTag = trees[t].mainTag;

    items.forEach(item => {
      const wd = item.tags[wdTag];
      if (!wd || !/^Q\d+$/.test(wd)) return;   // wikidata tag missing or looks wrong..
      if (dissolved[item.id]) return;          // dissolved/closed businesses

      const n = item.displayName;
      const kvn = `${k}/${v}|${n}`;

      if (!_presetData[k])     _presetData[k] = {};
      if (!_presetData[k][v])  _presetData[k][v] = {};
      _presetData[k][v][n] = {};

      if (brandsKeep[kvn]) {
        _presetData[k][v][n].count = brandsKeep[kvn];
      }

      _presetData[k][v][n].id = item.id;
      _presetData[k][v][n].locationSet = item.locationSet;
      _presetData[k][v][n].tags = item.tags;
    });
  });

  // Save individual data files
  fs.writeFileSync('dist/presets/name-suggestions.json', prettyStringify(_presetData));
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
  for (const key in _presetData) {
    let keygroup = topgroup.ele('group').att('name', key);

    for (const value in _presetData[key]) {
      let valuegroup = keygroup.ele('group').att('name', value);

      for (const displayName in _presetData[key][value]) {
        let item = valuegroup
          .ele('item')
          .att('name', displayName)
          .att('type', 'node,closedway,multipolygon');

        const tags = _presetData[key][value][displayName].tags;
        for (const k in tags) {
          item.ele('key').att('key', k).att('value', tags[k]);
        }
      }
    }
  }

  fs.writeFileSync('dist/presets/name-suggestions.presets.xml', root.end({ prettyPrint: true }));
  fs.writeFileSync('dist/presets/name-suggestions.presets.min.xml', root.end());
}


function buildTaginfo() {
  let taginfo = {
    'data_format': 1,
    'data_url': 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist/taginfo.json',
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical features for OpenStreetMap',
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


function minifySync(inPath, outPath) {
  try {
    const contents = fs.readFileSync(inPath, 'utf8');
    const minified = JSON.stringify(JSON5.parse(contents));
    fs.writeFileSync(outPath, minified);
  } catch (err) {
    console.error(colors.red(`Error - ${err.message} minifying:`));
    console.error('  ' + colors.yellow(inPath));
    process.exit(1);
  }
}