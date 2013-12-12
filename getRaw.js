#!/usr/bin/env node

var osmium = require('osmium');
var fs = require('fs');

var start = new Date().getTime();

if (process.argv.length < 3) {
    console.log("Usage: " + process.argv[0] + ' ' + process.argv[1] + " OSMFILE");
    process.exit(1);
}

var input_filename = process.argv[2],
    handler = new osmium.Handler(),
    output_filename = 'topNames.json',
    osmKeys = ['amenity', 'shop'],
    counts = {},
    THRESHOLD = 50;

handler.options({"tagged_nodes_only": true});
handler.on('node', takeTags);
handler.on('way', takeTags);

function takeTags(entity) {
    if (entity.tags) {
        var name = entity.tags('name');
        if (name) {
            var tags = entity.tags();
            for (var key in tags) {
                if (osmKeys.indexOf(key) != -1) {
                    var fullName = key + '/' + tags[key] + '|' + name;
                    if (counts[fullName]) {
                        counts[fullName] += 1;
                    } else {
                        counts[fullName] = 1;
                    }
                }
            }
        }
    }
}

function done() {
    var out = {};
    for (var key in counts) {
        if (counts[key] > THRESHOLD) {
            out[key] = counts[key];
        }
    }
    console.error('> 100: ' + Object.keys(out).length);
    fs.writeFileSync(output_filename,JSON.stringify(out))
}

handler.on('done', function() {
    done();
    console.error('run time: ' + Math.round((new Date().getTime() - start)/1000));
});

var reader = new osmium.Reader(input_filename,{node:true,way:true});
reader.apply(handler, { "with_location_handler": false });
