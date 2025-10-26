// External
//import geojsonArea from '@mapbox/geojson-area';
//import geojsonBounds from 'geojson-bounds';
import geojsonPrecision from 'geojson-precision';
import geojsonRewind from '@mapbox/geojson-rewind';
import { Glob } from 'bun';
import JSON5 from 'json5';
import jsonschema from 'jsonschema';
import path from 'node:path';
import localeCompare from 'locale-compare';
import stringify from '@aitodotai/json-stringify-pretty-compact';
import { styleText } from 'bun:util';
const withLocale = localeCompare('en-US');

// Internal
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';
const geojsonSchemaJSON = await Bun.file('./schema/geojson.json').json();
const featureSchemaJSON = await Bun.file('./schema/feature.json').json();

const Validator = jsonschema.Validator;
let v = new Validator();
v.addSchema(geojsonSchemaJSON, 'http://json.schemastore.org/geojson.json');

console.log(styleText('blue', '-'.repeat(70)));
console.log(styleText('blue', '🧩  Build features'));
console.log(styleText('blue', '-'.repeat(70)));
await buildAll();


async function buildAll() {
  const START = '🏗   ' + styleText('yellow', 'Building features...');
  const END = '👍  ' + styleText('green', 'features built');
  console.log('');
  console.log(START);
  console.time(END);

  const features = await collectFeatures();
  const featureCollection = { type: 'FeatureCollection', features: features };
  const stringified = stringify(featureCollection, { maxLength: 9999 }) + '\n';
  await writeFileWithMeta('./dist/featureCollection.json', stringified);

  console.timeEnd(END);
}


// Gather feature files from `./features/**/*.geojson`
async function collectFeatures() {
  let features = [];
  const seen = new Map();   // Map<id, filepath>
  process.stdout.write('📦  Features: ');

  const glob = new Glob('./features/**/*');
  for (const filepath of glob.scanSync()) {
    if (/\.md$/i.test(filepath)) continue;   // ignore markdown files
    if (!/\.geojson$/.test(filepath)) {
      console.error(styleText('red', `Error - file should have a .geojson extension:`));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }

    const contents = await Bun.file(filepath).text();
    let parsed;
    try {
      parsed = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(styleText('red', `Error - ${jsonParseError.message} in:`));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }

    let feature = geojsonPrecision(geojsonRewind(parsed, true), 5);
    let fc = feature.features;

    // A FeatureCollection with a single feature inside (geojson.io likes to make these).
    if (feature.type === 'FeatureCollection' && Array.isArray(fc) && fc.length === 1) {
      feature = fc[0];
    }

//    // Warn if this feature is so small it would better be represented as a circular area.
//    let area = geojsonArea.geometry(feature.geometry) / 1e6;   // m² to km²
//    area = Number(area.toFixed(2));
//    if (area < 2000) {
//      const extent = geojsonBounds.extent(feature);
//      const lon = ((extent[0] + extent[2]) / 2).toFixed(4);
//      const lat = ((extent[1] + extent[3]) / 2).toFixed(4);
//      console.warn('');
//      console.warn(styleText('yellow', `Warning for ` + styleText('yellow', filepath) + `:`));
//      console.warn(styleText('yellow', `GeoJSON feature for small area (${area} km²).  Consider circular include location instead: [${lon}, ${lat}]`));
//    }

    // use the filename as the feature.id
    const id = path.basename(filepath).toLowerCase();
    feature.id = id;

    // sort properties
    let obj = {};
    if (feature.type)       { obj.type = feature.type; }
    if (feature.id)         { obj.id = feature.id; }
    if (feature.properties) { obj.properties = feature.properties; }

    // validate that the feature has a suitable geometry
    if (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon') {
      console.error(styleText('red', 'Error - Feature type must be "Polygon" or "MultiPolygon" in:'));
      console.error('  ' + styleText('yellow', file));
      process.exit(1);
    }
    if (!feature.geometry?.coordinates) {
      console.error(styleText('red', 'Error - Feature missing coordinates in:'));
      console.error('  ' + styleText('yellow', file));
      process.exit(1);
    }
    obj.geometry = {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates
    };

    feature = obj;

    validateFile(filepath, feature, featureSchemaJSON);
    await prettifyFile(filepath, feature, contents);

    if (seen.has(id)) {
      console.error(styleText('red', 'Error - Duplicate filenames: ') + styleText('yellow', id));
      console.error(styleText('yellow', '  ' + seen.get(id)));
      console.error(styleText('yellow', '  ' + filepath));
      process.exit(1);
    }
    features.push(feature);
    seen.set(id, filepath);
  }

  // sort features by id, see: 800ca866f
  features.sort((a, b) => withLocale(a.id, b.id));

  console.log(`🧩  features:\t${features.length}`);
  return features;
}


// Performs JSON schema validation on the file.
function validateFile(file, resource, schema) {
  const validationErrors = v.validate(resource, schema).errors;
  if (validationErrors.length) {
    console.error(styleText('red', 'Error - Schema validation:'));
    console.error(styleText('yellow', '  ' + file + ': '));
    for (const e of validationErrors) {
      if (e.property) {
        console.error(styleText('yellow', '  ' + e.property + ' ' + e.message));
      } else {
        console.error(styleText('yellow', '  ' + e));
      }
    }
    process.exit(1);
  }
}


// Writes a prettified version of the file
async function prettifyFile(file, object, contents) {
  const pretty = stringify(object, { maxLength: 100 }) + '\n';
  if (pretty !== contents) {
    await Bun.write(file, pretty);
  }
}
