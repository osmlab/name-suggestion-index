const colors = require('colors/safe');
const fs = require('fs');
const glob = require('glob');
const JSON5 = require('json5');
const path = require('path');
const precision = require('geojson-precision');
const prettyStringify = require('json-stringify-pretty-compact');
const rewind = require('geojson-rewind');
const shell = require('shelljs');
const Validator = require('jsonschema').Validator;

const geojsonSchema = require('../schema/geojson.json');
const featureSchema = require('../schema/feature.json');

let v = new Validator();
v.addSchema(geojsonSchema, 'http://json.schemastore.org/geojson.json');


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

  // Start clean
  shell.rm('-f', ['dist/featureCollection.json']);

  // Features
  const features = collectFeatures();
  const featureCollection = { type: 'FeatureCollection', features: features };
  fs.writeFileSync('dist/featureCollection.json', prettyStringify(featureCollection, { maxLength: 9999 }));

  console.timeEnd(END);
}


//
// collectFeatures()
// Gather all the features from `features/**/*.geojson`
//
function collectFeatures() {
  let features = [];
  let files = {};

  glob.sync('features/**/*.geojson').forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    let parsed;
    try {
      parsed = JSON5.parse(contents);
    } catch (jsonParseError) {
      console.error(colors.red(`Error - ${jsonParseError.message} in:`));
      console.error('  ' + colors.yellow(file));
      process.exit(1);
    }

    let feature = precision(rewind(parsed, true), 4);
    let fc = feature.features;

    // A FeatureCollection with a single feature inside (geojson.io likes to make these).
    if (feature.type === 'FeatureCollection' && Array.isArray(fc) && fc.length === 1) {
      feature = fc[0];
    }

    // use the filename as the feature.id
    const id = path.basename(file).toLowerCase();
    feature.id = id;

    // sort properties
    let obj = {};
    if (feature.type)       { obj.type = feature.type; }
    if (feature.id)         { obj.id = feature.id; }
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

    validateFile(file, feature, featureSchema);
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
  console.log(`📦  features:\t${featureCount}`);
  return features;
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
  const pretty = prettyStringify(object, { maxLength: 100 });
  if (pretty !== contents) {
    fs.writeFileSync(file, pretty);
  }
}
