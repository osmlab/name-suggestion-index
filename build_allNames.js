#!/usr/bin/env node

// This script will process a planet file and extract frequently occuring names.
// It produces a file containing all the top names and tags: `dist/allNames.json`
//
// `allNames.json` contains a dictionary object in the format:
// "key/value|name": count
// "amenity/cafe|Starbucks": 159
//
// Please see README.md for more info

const colors = require('colors/safe');
const fs = require('fs');
const osmium = require('osmium');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

if (process.argv.length < 3) {
    console.log('');
    console.log('Usage:  node build_allNames <planet.osm>');
    console.log('');
    process.exit(1);
}

const checkKeys = ['amenity', 'shop', 'leisure', 'man_made', 'tourism'];
const THRESHOLD = process.argv[3] || 50;

var counts = {};
build();


function build() {
    console.log('building allNames.json');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/allNames.json']);

    var handler = new osmium.Handler();
    handler.options({ tagged_nodes_only: true });
    handler.on('node', countTags);
    handler.on('way', countTags);
    handler.on('relation', countTags);

    var reader = new osmium.Reader(process.argv[2]);
    osmium.apply(reader, handler);

    // filter
    var filtered = {};
    for (var key in counts) {
        if (counts[key] > THRESHOLD) {
            filtered[key] = counts[key];
        }
    }

    // sort
    var sorted = {};
    Object.keys(filtered).sort().forEach(function(k) {
        sorted[k] = filtered[k];
    });

    fs.writeFileSync('dist/allNames.json', stringify(sorted));
    console.timeEnd(colors.green('data built'));
}


function countTags(entity) {
    var name = entity.tags('name');  // fast name check
    if (!name) return;
    var tags = entity.tags();

    for (var i = 0; i < checkKeys.length; i++) {
        var key = checkKeys[i];
        if (!tags[key]) continue;

        var fullName = key + '/' + tags[key] + '|' + name;
        counts[fullName] = (counts[fullName] || 0) + 1;
    }
}

