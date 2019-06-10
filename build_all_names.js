#!/usr/bin/env node

// This script will process a planet file and extract frequently occuring names.
// It produces a file containing all the top names and tags: `dist/names_all.json`
//
// `names_all.json` contains a dictionary object in the format:
// "key/value|name": count
// "amenity/cafe|Starbucks": 159
//
// Please see README.md for more info

const colors = require('colors/safe');
const fs = require('fs');
const osmium = require('osmium');
const shell = require('shelljs');
const sort = require('./lib/sort');
const stringify = require('json-stringify-pretty-compact');

if (process.argv.length < 3) {
    console.log('');
    console.log('Usage:  node build_all_names <planet.osm>');
    console.log('');
    process.exit(1);
}

const checkKeys = ['amenity', 'shop', 'leisure', 'tourism'];
const THRESHOLD = process.argv[3] || 50;

let counts = {};
build();


function build() {
    console.log('building names_all.json');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/names_all.json']);

    let handler = new osmium.Handler();
    handler.options({ tagged_nodes_only: true });
    handler.on('node', countTags);
    handler.on('way', countTags);
    handler.on('relation', countTags);

    let reader = new osmium.Reader(process.argv[2]);
    osmium.apply(reader, handler);

    // filter
    let filtered = {};
    for (let key in counts) {
        if (counts[key] > THRESHOLD) {
            filtered[key] = counts[key];
        }
    }

    fs.writeFileSync('dist/names_all.json', stringify(sort(filtered)));
    console.timeEnd(colors.green('data built'));
}


function countTags(entity) {
    let name = entity.tags('name');  // fast name check
    if (!name) return;
    let tags = entity.tags();

    for (let i = 0; i < checkKeys.length; i++) {
        let key = checkKeys[i];
        if (!tags[key]) continue;

        let fullName = key + '/' + tags[key] + '|' + name;
        counts[fullName] = (counts[fullName] || 0) + 1;
    }
}
