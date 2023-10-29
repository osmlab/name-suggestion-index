// External
import chalk from 'chalk';
import fs from 'node:fs';
import geojsonPrecision from 'geojson-precision';
import geojsonRewind from '@mapbox/geojson-rewind';
import { globSync } from 'glob';
import JSON5 from 'json5';
import jsonschema from 'jsonschema';
import path from 'node:path';
import localeCompare from 'locale-compare';
import stringify from 'json-stringify-pretty-compact';
const withLocale = localeCompare('en-US');

// Internal
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';

// JSON
import geojsonSchemaJSON from '../schema/geojson.json' assert {type: 'json'};
import featureSchemaJSON from '../schema/feature.json' assert {type: 'json'};

const Validator = jsonschema.Validator;
let v = new Validator();
v.addSchema(geojsonSchemaJSON, 'http://json.schemastore.org/geojson.json');


console.log(chalk.blue('-'.repeat(70)));
console.log(chalk.blue('🧩  Build features'));
console.log(chalk.blue('-'.repeat(70)));
buildAll();


function buildAll() {
  const START = '🏗   ' + chalk.yellow('Building features...');
  const END = '👍  ' + chalk.green('features built');
  console.log('');
  console.log(START);
  console.time(END);

  const features = collectFeatures();
  const featureCollection = { type: 'FeatureCollection', features: features };
  const stringified = stringify(featureCollection, { maxLength: 9999 }) + '\n';
  writeFileWithMeta('dist/featureCollection.json', stringified);

  console.timeEnd(END);
}


//
// collectFeatures()
// Gather all the features from `features/**/*.geojson`
//
function collectFeatures() {
  let features = [];
  let files = {};

  globSync('features/**/*', { nodir: true }).forEach(file => {
    if (/\.md$/i.test(file)) return;  // ignore markdown/readme files - #7292

    if (!/\.geojson$/.test(file)) {
      console.error(chalk.red(`Error - file should have a .geojson extension:`));
      console.error('  ' + chalk.yellow(file));
      process.exit(1);
    }

    const contents = fs.readFileSync(file, 'utf8');
    let parsed;
    try {
      parsed = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(chalk.red(`Error - ${jsonParseError.message} in:`));
      console.error('  ' + chalk.yellow(file));
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
        console.error(chalk.red('Error - Feature type must be "Polygon" or "MultiPolygon" in:'));
        console.error('  ' + chalk.yellow(file));
        process.exit(1);
      }
      if (!feature.geometry.coordinates) {
        console.error(chalk.red('Error - Feature missing coordinates in:'));
        console.error('  ' + chalk.yellow(file));
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
      console.error(chalk.red('Error - Duplicate filenames: ') + chalk.yellow(id));
      console.error('  ' + chalk.yellow(files[id]));
      console.error('  ' + chalk.yellow(file));
      process.exit(1);
    }
    features.push(feature);
    files[id] = file;
  });

  // sort features by id, see: 800ca866f
  features.sort((a, b) => withLocale(a.id, b.id));

  const featureCount = Object.keys(files).length;
  console.log(`🧩  features:\t${featureCount}`);
  return features;
}


//
// validateFile()
// Performs JSON schema validation on the file.
//
function validateFile(file, resource, schema) {
  const validationErrors = v.validate(resource, schema).errors;
  if (validationErrors.length) {
    console.error(chalk.red('Error - Schema validation:'));
    console.error('  ' + chalk.yellow(file + ': '));
    validationErrors.forEach(error => {
      if (error.property) {
        console.error('  ' + chalk.yellow(error.property + ' ' + error.message));
      } else {
        console.error('  ' + chalk.yellow(error));
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
