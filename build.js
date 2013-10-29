var fs = require('fs'),
    find = require('findit'),
    jsonlint = require('jsonlint');

var outfile = 'name-suggestions.json',
    outfileMin = outfile.split('.json')[0] + '.min.json',
    osmKeys = ['amenity', 'shop'],
    finder = find('.'),
    files = [],
    data = {};

if (fs.existsSync(outfile)) fs.unlinkSync(outfile);
if (fs.existsSync(outfileMin)) fs.unlinkSync(outfileMin);

finder.on('file', function (file) {
    if (file.split('.json').length > 1) {
        if (osmKeys.indexOf(file.split('/')[0]) != -1) {
            files.push(file);
        }
    }
});

finder.on('end', function() {
    files.sort();
    for (var i = 0; i < files.length; i++) {
        var file = files[i],
            tagCombo = file.split('.json')[0];

        file = fs.readFileSync(file, 'utf8');
        data[tagCombo] = jsonlint.parse(file);
    }
    build();
});

function build() {
    var d = new Date(),
        version = '// ' + d.getMonth() + '/' + d.getDate() + '/' + d.getFullYear() +
        ' ' + Math.round(d.getTime()/1000)  + '\n';
    fs.appendFileSync(outfile, version + JSON.stringify(data, null, 4));
    fs.appendFileSync(outfile.split('.json')[0] + '.min.json', version + JSON.stringify(data));
}
