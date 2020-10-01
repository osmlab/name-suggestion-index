const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

// validate the brand_filters.json file
const filters = require('../config/brand_filters.json');
const filtersSchema = require('../schema/filters.json');
const validate = require('../lib/validate');
validate('config/brand_filters.json', filters, filtersSchema);

// reading a fileTree will also validate its contents
const fileTree = require('../lib/file_tree');

let _cache = { path: {}, id: {} };
fileTree.read('brands', _cache, loco);
fileTree.read('transit', _cache, loco);
