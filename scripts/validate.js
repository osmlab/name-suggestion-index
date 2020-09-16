const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

// validate the filters.json file
const filters = require('../config/filters.json');
const filtersSchema = require('../schema/filters.json');
const validate = require('../lib/validate');
validate('config/filters.json', filters, filtersSchema);

// reading a fileTree will also validate its contents
const fileTree = require('../lib/file_tree');

let _cache = { path: {}, id: {} };
fileTree.read('brands', _cache, loco);
