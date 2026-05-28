import { $ } from 'bun';
import LocationConflation from '@rapideditor/location-conflation';
import stringify from 'json-stringify-pretty-compact';
import { styleText } from 'node:util';

import { fileTree } from '../lib/file_tree.ts';
import { buildIDPresets } from '../lib/presets_id.ts';
import { buildJOSMPresets } from '../lib/presets_josm.ts';

import type { NsiCache, NsiData, NsiDissolved, NsiJSON, NsiWikidataJSON, TaginfoItem, TaginfoJSON } from '../lib/types.ts';

const withLocale = new Intl.Collator('en-US').compare;  // specify 'en-US' for stable sorting

// JSON
const packageJSON = await Bun.file('./package.json').json();
let featureCollectionJSON;
try {
  featureCollectionJSON = await Bun.file('./dist/json/featureCollection.json').json();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(styleText('red', `Error: ${message} `));
  console.error(styleText('yellow', `Please run 'bun run build' first.`));
  process.exit(1);
}
let dissolvedJSON!: NsiDissolved;
let wikidataJSON!: NsiWikidataJSON;
try {
  dissolvedJSON = await Bun.file('./dist/wikidata/dissolved.json').json();
  wikidataJSON = await Bun.file('./dist/wikidata/wikidata.json').json();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(styleText('red', `Error: ${message} `));
  console.error(styleText('yellow', `Please run 'bun run wikidata' first.`));
  process.exit(1);
}


const dissolved = dissolvedJSON.dissolved;
const wikidata = wikidataJSON.wikidata;

// iD's presets which we will build on
const presetsFile = './node_modules/@openstreetmap/id-tagging-schema/dist/presets.json';
const presetsJSON = await Bun.file(presetsFile).json();

// We use LocationConflation for validating and processing the locationSets
const _loco = new LocationConflation(featureCollectionJSON);
const _nsi = {} as NsiCache;


await loadIndex();
await distAll();


/** Read and expand all category files under `./data/*` into `_nsi`. */
async function loadIndex() {
  const START = '🏗   ' + styleText('yellow', `Loading index files…`);
  const END = '👍  ' + styleText('green', `done loading`);
  console.log(START);
  console.time(END);

  await fileTree.read(_nsi, _loco);
  fileTree.expandTemplates(_nsi, _loco);
  console.timeEnd(END);
}


/** Generate all output files under `./dist/*`. */
async function distAll() {
  const START = '🏗   ' + styleText('yellow', 'Building data...');
  const END = '👍  ' + styleText('green', 'data built');

  console.log('');
  console.log(START);
  console.time(END);

  await updateVersion();

  // Copy files from `./config` to `./dist/json`
  await $`cp ./config/genericWords.json  ./dist/json`;
  await $`cp ./config/matchGroups.json  ./dist/json`;
  await $`cp ./config/replacements.json  ./dist/json`;
  await $`cp ./config/trees.json  ./dist/json`;

  // Write `nsi.json` as a single file containing everything by path
  // Reverse sort the paths, we want 'brands' to override 'operators'
  // see: https://github.com/osmlab/name-suggestion-index/issues/5693#issuecomment-2819259226
  const sorted: NsiData = {};
  Object.keys(_nsi.path).sort((a, b) => withLocale(b, a)).forEach(tkv => {
    sorted[tkv] = _nsi.path[tkv];
  });

  const output: NsiJSON = { nsi: sorted };
  await Bun.write('./dist/json/nsi.json', stringify(output, { maxLength: 800 }) + '\n');

  await writeIDPresets();     // nsi-id-presets.json
  await writeJOSMPresets();   // nsi-josm-presets.json
  await buildTaginfo();       // taginfo.json
}


/** Bump the `version` field in `package.json` to a date-stamped value (`Major.Minor.YYYYMMDD`). */
async function updateVersion() {
  // Bump the project version..
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = ('0' + (now.getUTCMonth() + 1)).slice(-2);
  const dd = ('0' + now.getUTCDate()).slice(-2);

  const oldVersion = packageJSON.version;
  let newVersion;
  const match = packageJSON.version.match(/^(\d+)\.(\d+)/);
  if (match[1] && match[2]) {
    newVersion = `${match[1]}.${match[2]}.${yyyy}${mm}${dd}`;
  }
  if (!newVersion) {
    throw new Error(`Error:  Invalid 'package.json' version: ${oldVersion}`);
  }

  if (newVersion !== oldVersion) {
    console.log('🎉  ' + styleText('green', 'Bumping package version to ') + styleText(['green','bold'], `v${newVersion}`));
    packageJSON.version = newVersion;
    await $`bun pm pkg set version="${newVersion}"`;
  }
}


/**
 * Build iD editor presets from NSI data and write to `./dist/presets/nsi-id-presets.json`.
 * @see https://github.com/openstreetmap/id-tagging-schema
 */
async function writeIDPresets() {
  const result = buildIDPresets(_nsi.path, {
    sourcePresets: presetsJSON,
    wikidata: wikidata,
    dissolved: dissolved
  });

  if (result.missing.length > 0) {
    console.log(styleText('yellow', `\n⚠️  Category files without presets at @openstreetmap/id-tagging-schema for their key-value combination:`));
    for (const tkv of result.missing) {
      console.log(`* no iD source preset found for ${tkv}`);
    }
  }

  const output = { presets: result.presets };
  await Bun.write('./dist/presets/nsi-id-presets.json', stringify(output) + '\n');
}


/**
 * Build JOSM tagging presets from NSI data and write them to:
 * - `./dist/presets/nsi-josm-presets.xml` (pretty-printed)
 * - `./dist/presets/nsi-josm-presets.min.xml` (compact)
 * @see https://josm.openstreetmap.de/wiki/TaggingPresets
 */
async function writeJOSMPresets() {
  const result = buildJOSMPresets(_nsi.path, {
    version: packageJSON.version,
    description: packageJSON.description,
    dissolved: dissolved
  });

  await Bun.write('./dist/presets/nsi-josm-presets.xml', result.serialize({ prettyPrint: true }));
  await Bun.write('./dist/presets/nsi-josm-presets.min.xml', result.serialize());
}


/**
 * Collect all `key=value` tag pairs used across NSI data and write a taginfo
 * project file to `./dist/json/taginfo.json`.
 * @see https://wiki.openstreetmap.org/wiki/Taginfo/Projects
 */
async function buildTaginfo() {
  const taginfo: Partial<TaginfoJSON> = {
    'data_format': 1,
    'data_url': 'https://cdn.jsdelivr.net/npm/name-suggestion-index@latest/dist/json/taginfo.json',
    'project': {
      'name': 'name-suggestion-index',
      'description': 'Canonical features for OpenStreetMap',
      'project_url': 'https://github.com/osmlab/name-suggestion-index',
      'doc_url': 'https://github.com/osmlab/name-suggestion-index/blob/main/README.md',
      'icon_url': 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/fast-food-15.svg',
      'contact_name': 'Bryan Housel',
      'contact_email': 'bhousel@gmail.com'
    }
  };

  // Collect all tag pairs
  const tagPairs: Record<string, TaginfoItem> = {};
  for (const [path, category] of Object.entries(_nsi.path)) {
    for (const item of category.items) {
      // eslint-disable-next-line prefer-const
      for (let [k, v] of Object.entries(item.tags)) {
        // Don't export every value for many tags this project uses..
        // ('tag matches any of these')(?!('not followed by :type'))
        if (/(bic|brand|brewery|country|flag|internet_access:ssid|max_age|min_age|name|network|operator|owner|ref|subject)(?!(:type))/.test(k)) {
          v = '*';
        }

        const kv = `${k}/${v}`;
        tagPairs[kv] ||= { key: k };

        if (v !== '*') {
          tagPairs[kv].value = v;
          const [_, kPreset, vPreset] = path.split('/');
          if (k === kPreset && v === vPreset) {
            tagPairs[kv].doc_url = `${packageJSON.homepage}/?k=${k}&v=${v}`;
          }
        }
      }
    }
  }

  taginfo.tags = Object.keys(tagPairs).sort(withLocale).map(kv => tagPairs[kv]);
  await Bun.write('./dist/json/taginfo.json', stringify(taginfo, { maxLength: 9999 }) + '\n');
}
