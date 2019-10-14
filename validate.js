// validate the filters.json file
const filters = require('./config/filters.json');
const filtersSchema = require('./schema/filters.json');
const validate = require('./lib/validate');
validate('config/filters.json', filters, filtersSchema);

// reading a fileTree will also validate its contents
const fileTree = require('./lib/file_tree');
fileTree.read('brands');
