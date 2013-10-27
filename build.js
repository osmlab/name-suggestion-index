var find = require('findit'),
    keys = ['amenity', 'shop'],
    finder = find('.');

finder.on('file', function (file) {
    // on each json file
    if (file.split('.json').length > 1) {
        var loc = file.split('/');
        // if that file is in a dir that matches an item in the keys array
        if (loc.length > 1 && keys.indexOf(loc[0]) != -1) {
            // do stuff with it
            console.log(file);
        }
    }
});
