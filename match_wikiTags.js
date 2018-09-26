const colors = require('colors/safe');
const diacritics = require('diacritics');
const fetch = require('node-fetch');
const fs = require('fs');
const readline = require('readline');
const stringify = require('json-stringify-pretty-compact');
const wdk = require('wikidata-sdk');

var canonical = require('./config/canonical.json');

var toMatch = getKeysToMatch().slice(0,5);
nextMatch();

// readline.emitKeypressEvents(process.stdin);
// process.stdin.setRawMode(true);

// process.stdin.on('keypress', (str, key) => {
//     if (key.ctrl && key.name === 'c') {
//         process.exit();   // eslint-disable-line no-process-exit
//     } else {
//         if (str === 'y') {
//             console.log('yes');
//         } else if (str === 'n') {
//             console.log('no');
//         }
//     }
// });


function getKeysToMatch() {
    let tryMatch = {};
    let seen = {};
    Object.keys(canonical).forEach(k => {
        // if `brand:wikidata` or `brand:wikipedia` tags are missing or look wrong..
        const wd = canonical[k].tags['brand:wikidata'];
        if (!wd || !/^Q\d+$/.test(wd)) {
            tryMatch[k] = true;
        }
        const wp = canonical[k].tags['brand:wikipedia'];
        if (!wp || !/^[a-z_]{2,}:[^_]*$/.test(wp)) {
            tryMatch[k] = true;
        }

        // ...but skip if the name appears to be a duplicate
        const stem = stemmer(k.split('|', 2)[1]);
        const other = seen[stem];
        if (other) {
            delete tryMatch[k];
            delete tryMatch[other];
        }
        seen[stem] = k;
    });

    return Object.keys(tryMatch);
    // fs.writeFileSync('config/canonical.json', stringify(sort(canonical), { maxLength: 50 }));
}


function nextMatch() {
    const k = toMatch.shift();
    if (!k) {
        process.exit();
    }

    console.log(colors.yellow(`\nkey = ${k}`));

    const name = k.split('|', 2)[1];
    const searchURL = wdk.searchEntities({search: name, lang: 'en', limit: 1, format: 'json'});

    fetch(searchURL)
        .then(response => response.json())
        .then(result => {
            if (result.search.length) {
                entity = result.search[0];
                console.log(colors.green(`Matched:  ${entity.label} (${entity.id})`));
                if (entity.description) {
                    console.log(colors.green(`"${entity.description}"`));
                }
                return entity;
            }
            throw new Error(`"${name}" not found`);
        })
        .then(entity => {
            const sparqlURL = wdk.sparqlQuery(entitySPARQL(entity));
            return fetch(sparqlURL);
        })
        .then(response => response.json())
        .then(result => {
            const results = (result.results && result.results.bindings) || [];
            const instances = results.map(obj => obj.isaLabel.value);
            if (instances.length) {
                console.log(colors.green(`instance of: [${instances.join(', ')}]`));
            }
        })
        .catch(err => console.error(err))
        .then(nextMatch);
}


//
// Returns an object with sorted keys and sorted values.
// (This is useful for file diffing)
//
function sort(obj) {
    var sorted = {};
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
}


// Removes noise from the name so that we can compare
// similar names for catching duplicates.
function stemmer(name) {
    var noise = [
        /ban(k|c)(a|o)?/ig,
        /банк/ig,
        /coop/ig,
        /express/ig,
        /(gas|fuel)/ig,
        /wireless/ig,
        /(shop|store)/ig,
        /[.,\/#!$%\^&\*;:{}=\-_`~()]/g,
        /\s/g
    ];

    name = noise.reduce((acc, regex) => acc.replace(regex, ''), name);
    return diacritics.remove(name.toLowerCase());
}


function entitySPARQL(entity) {
    return `SELECT ?isa ?isaLabel WHERE {
        wd:${entity.id} wdt:P31 ?isa.
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en" .
        }
      }`;
}
