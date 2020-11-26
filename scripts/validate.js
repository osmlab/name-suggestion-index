const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

// validate the config files
const validate = require('../lib/validate');
validate(
  'config/genericWords.json',
  require('../config/genericWords.json'),
  require('../schema/genericWords.json')
);
validate(
  'config/replacements.json',
  require('../config/replacements.json'),
  require('../schema/replacements.json')
);
validate(
  'config/trees.json',
  require('../config/trees.json'),
  require('../schema/trees.json')
);

// reading a fileTree will also validate its contents
const fileTree = require('../lib/file_tree');
let _cache = {};
fileTree.read(_cache, loco);