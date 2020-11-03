const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

// validate the filter files
const filtersSchema = require('../schema/filters.json');
const validate = require('../lib/validate');

const filterBrands = require('../config/filter_brands.json');
validate('config/filter_brands.json', filterBrands, filtersSchema);
const filterOperators = require('../config/filter_operators.json');
validate('config/filter_operators.json', filterOperators, filtersSchema);
const filterTransit = require('../config/filter_brands.json');
validate('config/filter_transit.json', filterTransit, filtersSchema);

// reading a fileTree will also validate its contents
const fileTree = require('../lib/file_tree');
let _cache = { path: {}, id: {} };
fileTree.read('brands', _cache, loco);
fileTree.read('operators', _cache, loco);
fileTree.read('transit', _cache, loco);
