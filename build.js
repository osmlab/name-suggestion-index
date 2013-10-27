var fs = require('fs'),
    find = require('findit'),
    jsonlint = require('jsonlint');

var outfile = 'name-suggestion-index.json',
    keys = ['amenity', 'shop'],
    finder = find('.'),
    files = [];

fs.unlinkSync(outfile);

finder.on('file', function (file) {
    if (file.split('.json').length > 1) {
        if (keys.indexOf(file.split('/')[0]) != -1) {
            files.push(file);
        }
    }
});

finder.on('end', function() {
    var version = '// ' + Math.round(new Date().getTime()/1000) + '\n';
    fs.appendFileSync(outfile, version);
    // first line comment with unixtime and version
        // can we get version from package.json? it is json right?
        // var version = fs.readFileSync('package.json', 'utf8');
        // version = jsonlint.parse(version).version;

    for (var i = 0; i < files.length; i++) {
        var file = files[i],
            tagCombo = file.split('.json')[0],
            data = {};
    
        file = fs.readFileSync(file, 'utf8');
        data[tagCombo] = jsonlint.parse(file);
        fs.appendFileSync(outfile, JSON.stringify(data, null, 4));
    }
});
