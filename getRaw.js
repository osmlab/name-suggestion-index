#!/usr/bin/env node

// on hold till node-osmium is faster
var osmium = require('/Users/aaron/libosmium/node-osmium/lib/osmium.js');

var start = new Date().getTime();
console.log('running');

if (process.argv.length != 4) {
    console.log("Usage: " + process.argv[0] + ' ' + process.argv[1] + " OSMFILE OUTFILE");
    process.exit(1);
}

var input_filename = process.argv[2],
    output_filename = process.argv[3],
    handler = new osmium.Handler(),
    osmKeys = ['amenity', 'shop'],
    counts = {};

handler.options({"tagged_nodes_only": true});

handler.on('node', takeTags);
handler.on('way', takeTags);
handler.on('relation', takeTags);

function takeTags(entity) {
    if (entity.tags) {
        for (var key in entity.tags) {
            if (entity.tags.name && osmKeys.indexOf(key) != -1) {
                var fullName = key + '/' + entity.tags[key] + '|' + entity.tags.name;
                if (counts[fullName]) {
                    counts[fullName] += 1;
                } else {
                    counts[fullName] = 1;
                }
            }
        }
    }
}

function done() {
    var out = {};
    for (var key in counts) {
        if (counts[key] > 100) {
            out[key] = counts[key];
        }
    }
    console.log('> 100: ' + Object.keys(out).length);
    console.log(out);
}

handler.on('done', function() {
    done();
    console.log('run time: ' + Math.round((new Date().getTime() - start)/1000));
});

var reader = new osmium.Reader(input_filename);
reader.apply(handler, { "with_location_handler": false });
