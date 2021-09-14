// External
import colors from 'colors/safe.js';
import fs from 'node:fs';
import geojsonArea from '@mapbox/geojson-area';
import geojsonBounds from 'geojson-bounds';
import geojsonPrecision from 'geojson-precision';
import geojsonRewind from '@mapbox/geojson-rewind';
import glob from 'glob';
import JSON5 from 'json5';
import jsonschema from 'jsonschema';
import path from 'node:path';
import stringify from '@aitodotai/json-stringify-pretty-compact';

// Internal
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';

// JSON
import geojsonSchemaJSON from '../schema/geojson.json';
import featureSchemaJSON from '../schema/feature.json';

const Validator = jsonschema.Validator;
let v = new Validator();
v.addSchema(geojsonSchemaJSON, 'http://json.schemastore.org/geojson.json');


console.log(colors.blue('-'.repeat(70)));
console.log(colors.blue('🧩  Build features'));
console.log(colors.blue('-'.repeat(70)));
buildAll();


function buildAll() {
  const START = '🏗   ' + colors.yellow('Building features...');
  const END = '👍  ' + colors.green('features built');
  console.log('');
  console.log(START);
  console.time(END);

  const features = collectFeatures();
  let featureCollection = { type: 'FeatureCollection', features: features };
  writeFileWithMeta('dist/featureCollection.json', stringify(featureCollection, { maxLength: 9999 }) + '\n');

  console.timeEnd(END);
}


//
// collectFeatures()
// Gather all the features from `features/**/*.geojson`
//
function collectFeatures() {
  let features = [];
  let files = {};

  glob.sync('features/**/*', { nodir: true }).forEach(file => {
    if (!/\.geojson$/.test(file)) {
      console.error(colors.red(`Error - file should have a .geojson extension:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    const contents = fs.readFileSync(file, 'utf8');
    let parsed;
    try {
      parsed = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} in:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    let feature = geojsonPrecision(geojsonRewind(parsed, true), 5);
    const fc = feature.features;

    // A FeatureCollection with a single feature inside (geojson.io likes to make these).
    if (feature.type === 'FeatureCollection' && Array.isArray(fc) && fc.length === 1) {
      feature = fc[0];
    }

    // use the filename as the feature.id
    const id = path.basename(file).toLowerCase();
    feature.id = id;

    // Warn if this feature is so small/complex it would better be represented as a circular area.
    const except = { 'new_york_city.geojson': true };
    if (!except[id]) {
      const coordLength = countCoordinates(feature.geometry.coordinates);
      let area = geojsonArea.geometry(feature.geometry) / 1e6;   // m² to km²
      area = Number(area.toFixed(2));
      if (area < 2000 && coordLength > 15) {
        const extent = geojsonBounds.extent(feature);
        const lon = ((extent[0] + extent[2]) / 2).toFixed(4);
        const lat = ((extent[1] + extent[3]) / 2).toFixed(4);
        console.warn('');
        console.warn(colors.yellow(`Warning - GeoJSON feature for small area (${area} km²).  Consider circular include location instead: [${lon}, ${lat}]`));
        console.warn('  ' + colors.yellow(file));
      }
    }

    // sort properties
    let obj = {};
    if (feature.type)  { obj.type = feature.type; }
    if (feature.id)    { obj.id = feature.id; }
    if (feature.properties) {
      obj.properties = feature.properties;
      delete obj.properties.id;  // to prevent possiblity of conflicting ids
    } else {
      obj.properties = {};
    }

    if (feature.geometry) {
      if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
        console.error(colors.red('Error - Feature type must be "Polygon" or "MultiPolygon" in:'));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
      if (!feature.geometry.coordinates) {
        console.error(colors.red('Error - Feature missing coordinates in:'));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
      }
      obj.geometry = {
        type: feature.geometry.type,
        coordinates: feature.geometry.coordinates
      };
    }

    feature = obj;

    validateFile(file, feature, featureSchemaJSON);
    prettifyFile(file, feature, contents);

    if (files[id]) {
      console.error(colors.red('Error - Duplicate filenames: ') + colors.yellow(id));
      console.error('  ' + colors.yellow(files[id]));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }
    features.push(feature);
    files[id] = file;
  });

  const featureCount = Object.keys(files).length;
  console.log(`🧩  features:\t${featureCount}`);
  return features;
}


//
// countCoordinates()
// Counts the number of coordinates in a GeoJSON Polygon or MultiPolygon
//
function countCoordinates(coords) {
  const a = Array.isArray(coords);
  const b = a && Array.isArray(coords[0]);
  const c = b && Array.isArray(coords[0][0]);
  const d = c && Array.isArray(coords[0][0][0]);

  let length = 0;
  if (d) {  // Multipolygon
    coords.forEach(polys => {
      polys.forEach(rings => length += rings.length);
    });
  } else {  // Polygon
    coords.forEach(rings => length += rings.length);
  }
  return length;
}



//
// validateFile()
// Performs JSON schema validation on the file.
//
function validateFile(file, resource, schema) {
  const validationErrors = v.validate(resource, schema).errors;
  if (validationErrors.length) {
    console.error(colors.red('Error - Schema validation:'));
    console.error('  ' + colors.yellow(file + ': '));
    validationErrors.forEach(error => {
      if (error.property) {
        console.error('  ' + colors.yellow(error.property + ' ' + error.message));
      } else {
        console.error('  ' + colors.yellow(error));
      }
    });
    process.exit(1);
  }
}


//
// prettifyFile()
// Writes a prettified version of the file
//
function prettifyFile(file, object, contents) {
  const pretty = stringify(object, { maxLength: 100 }) + '\n';
  if (pretty !== contents) {
    fs.writeFileSync(file, pretty);
  }
}
