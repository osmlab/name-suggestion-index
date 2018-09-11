
// This script will process a `allNames` file and remove the names we don't want.
// It produces a file containing all filtered names and tags: `dist/filterNames.json`
// Please see README.md for more info

const colors = require('colors/safe');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

// `allNames.json` is a dictionary object in the format:
// "key/value|name": count
// e.g.
// "shop/coffee|Starbucks": 159

const filters = require('./filters.json');
const allNames = require('./dist/allNames.json');

build();


function build() {
    console.log('filtering names');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/keepNames.json', 'dist/discardNames.json']);

    // all names start out in discard..
    var discard = Object.assign({}, allNames);
    var keep = {};

    // filter by keepTags (move from discard -> keep)
    filters.keepTags.forEach(function(s) {
        var re = new RegExp(s, 'i');
        for (var key in discard) {
            var tag = key.split('|', 2)[0];
            if (re.test(tag)) {
                keep[key] = discard[key];
                delete discard[key];
            }
        }
    });

    // filter by discardNames (move from keep -> discard)
    filters.discardNames.forEach(function(s) {
        var re = new RegExp(s, 'i');
        for (var key in keep) {
            var name = key.split('|', 2)[1];
            if (re.test(name)) {
                discard[key] = keep[key];
                delete keep[key];
            }
        }
    });

    // re-sort discard
    var sorted = {};
    Object.keys(discard).sort().forEach(function(k) {
        sorted[k] = discard[k];
    });


    fs.writeFileSync('dist/discardNames.json', stringify(sorted));
    fs.writeFileSync('dist/keepNames.json', stringify(keep));
    console.timeEnd(colors.green('data built'));
}

