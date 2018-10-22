const colors = require('colors/safe');
const fs = require('fs');
const package = require('./package.json');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');
const xmlbuilder = require('xmlbuilder');

const canonical = require('./config/canonical.json');
let out = {};

buildAll();


function buildAll() {
    console.log('building data');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/name-suggestions.*']);

    buildJSON();
    buildXML();

    console.timeEnd(colors.green('data built'));
}


function buildJSON() {
    Object.keys(canonical).forEach(k => {
        const obj = canonical[k];
        const wd = obj.tags['brand:wikidata'];
        if (!wd || !/^Q\d+$/.test(wd)) return;   // wikidata tag missing or looks wrong..

        const parts = k.split('|', 2);
        const tag = parts[0].split('/', 2);
        const key = tag[0];
        const value = tag[1];
        const name = parts[1];

        if (!out[key]) {
            out[key] = {};
        }
        if (!out[key][value]) {
            out[key][value] = {};
        }

        out[key][value][name] = {
            count: obj.count,
            tags: obj.tags
        };
    });

    // Save individual data files
    fs.writeFileSync('dist/name-suggestions.json', stringify(out));
    fs.writeFileSync('dist/name-suggestions.min.json', JSON.stringify(out));
}


function buildXML() {
    let presets = xmlbuilder
        .create('presets', { version: '1.0', encoding: 'UTF-8' })
        .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
        .att('author', 'Name Suggestion Index')
        .att('shortdescription', 'Name Suggestion Index')
        .att('description', package.description)
        .att('link', 'https://github.com/' + package.repository)
        .att('version', package.version);

    let topgroup = presets
        .ele('group')
        .att('name', 'Name Suggestion Index');

    // Create JOSM presets using the key and value structure from the json
    // to organize the presets into JOSM preset groups.
    for (let key in out) {
        let keygroup = topgroup.ele('group').att('name', key);

        for (let value in out[key]) {
            let valuegroup = keygroup.ele('group').att('name', value);

            for (let name in out[key][value]) {
                let item = valuegroup
                    .ele('item')
                    .att('name', name)
                    .att('type', 'node,closedway,multipolygon');

                let tags = out[key][value][name].tags;
                for (let k in tags) {
                    item.ele('key').att('key', k).att('value', tags[k]);
                }
            }
        }
    }

    let xmlstring = presets.end({ pretty: true })
    fs.writeFileSync('dist/name-suggestions.presets.xml', xmlstring);
}
