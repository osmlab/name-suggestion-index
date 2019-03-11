const colors = require('colors/safe');
const fs = require('fs-extra');
const glob = require('glob');
const sort = require('./sort');
const stringify = require('json-stringify-pretty-compact');

// validate the files as we read them
const validate = require('./validate');
const entriesSchema = require('../schema/entries.json');


exports.read = (tree) => {
    console.log('\nreading ' + tree);
    console.time(colors.green(tree + ' loaded'));

    let obj = {};
    glob.sync(`./${tree}/**/*.json`).forEach(function(file) {
        let contents = fs.readFileSync(file, 'utf8');
        let json;
        try {
            json = JSON.parse(contents);
        } catch (jsonParseError) {
            console.error(colors.red('Error - ' + jsonParseError.message + ' reading:'));
            console.error('  ' + colors.yellow(file));
            process.exit(1);
        }

        validate(file, json, entriesSchema);

        Object.keys(json).forEach(k => { obj[k] = json[k]; });
    });

    console.timeEnd(colors.green(tree + ' loaded'));
    return obj;
};


exports.write = (tree, obj) => {
    console.log('\nwriting ' + tree);
    console.time(colors.green(tree + ' updated'));
    let dict = {};


    // populate K-V dictionary
    Object.keys(obj).forEach(k => {
        let parts = k.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];

        dict[key] = dict[key] || {};
        dict[key][value] = dict[key][value] || {};
        dict[key][value][k] = sort(obj[k]);

        if (dict[key][value][k].tags) {
            dict[key][value][k].tags = sort(obj[k].tags);
        }
    });

    Object.keys(dict).forEach(k => {
        let entry = dict[k];
        Object.keys(entry).forEach(v => {
            let file = `./${tree}/${k}/${v}.json`;
            try {
                fs.ensureFileSync(file);
                fs.writeFileSync(file, stringify(sort(dict[k][v]), { maxLength: 50 }));
            } catch (err) {
                console.error(colors.red('Error - ' + err.message + ' writing:'));
                console.error('  ' + colors.yellow(file));
                process.exit(1);
            }
        });
    });

    console.timeEnd(colors.green(tree + ' updated'));
};
