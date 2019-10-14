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

const checkKeys = ['amenity', 'shop', 'leisure', 'tourism', 'office'];
const THRESHOLD = process.argv[3] || 50;

build();


function build() {
    console.log('building names_all.json');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/names_all.json']);
    let all = {};

    // process one key at a time to reduce memory footprint
    checkKeys.forEach(k => {
        // count
        console.log(` counting ${k}`);
        let counted = {};
        let handler = new osmium.Handler();
        handler.options({ tagged_nodes_only: true });
        handler.on('node', countEntity);
        handler.on('way', countEntity);
        handler.on('relation', countEntity);

        let reader = new osmium.Reader(process.argv[2]);
        osmium.apply(reader, handler);

        // filter
        console.log(` filtering ${k}`);
        for (let kvn in counted) {
            if (counted[kvn] > THRESHOLD) {
                all[kvn] = counted[kvn];  // keep
            }
        }

        function countEntity(entity) {
            let n = entity.tags('name');
            if (!n) return;

            let v = entity.tags(k);
            if (!v) return;

            let kvn = `${k}/${v}|${n}`;
            counted[kvn] = (counted[kvn] || 0) + 1;
        }
    });


    fs.writeFileSync('dist/names_all.json', stringify(sort(all)));
    console.timeEnd(colors.green('data built'));
}

