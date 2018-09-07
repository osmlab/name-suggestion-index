#!/usr/bin/env node

const colors = require('colors/safe');
const fs = require('fs');
const osmium = require('osmium');
const stringify = require('json-stringify-pretty-compact');

if (process.argv.length < 3) {
    console.log('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' <planetFile.osm>');
    process.exit(1);
}

const osmKeys = ['amenity', 'shop', 'leisure', 'man_made', 'tourism'];
const THRESHOLD = process.argv[3] || 50;

var counts = {};
build();


function build() {
    console.log('building topNames.json');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/topNames.json']);

    var handler = new osmium.Handler();
    handler.options({ tagged_nodes_only: true });
    handler.on('node', takeTags);
    handler.on('way', takeTags);
    handler.on('done', done);

    var reader = new osmium.Reader(process.argv[2], { node: true, way: true });
    reader.apply(handler, { with_location_handler: false });
}


function takeTags(entity) {
    if (entity.tags && entity.tags('name')) {
        var tags = entity.tags();
        for (var key in tags) {
            if (osmKeys.indexOf(key) != -1) {
                var fullName = key + '/' + tags[key] + '|' + entity.tags('name');
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
        if (counts[key] > THRESHOLD) {
            out[key] = counts[key];
        }
    }
    console.error('> ' + THRESHOLD + ': ' + Object.keys(out).length);
    fs.writeFileSync('dist/topNames.json', stringify(out));
    console.timeEnd(colors.green('data built'));
}

