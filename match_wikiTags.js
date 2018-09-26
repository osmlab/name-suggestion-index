const colors = require('colors/safe');
const diacritics = require('diacritics');
const fetch = require('node-fetch');
const fs = require('fs');
const readline = require('readline');
const stringify = require('json-stringify-pretty-compact');
const wdk = require('wikidata-sdk');

var canonical = require('./config/canonical.json');

var toMatch = getKeysToMatch().slice(0,5);
var total = toMatch.length;
var count = 0;
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
        console.log('');
        process.exit();
    }

    console.log(colors.yellow(`\n[${++count}/${total}]: ${k}`));

    const name = k.split('|', 2)[1];
    const lang = 'en';
    const searchURL = wdk.searchEntities({
        search: name, lang: lang, limit: 3, format: 'json', uselang: 'en'
    });
    let choices = [];

    fetch(searchURL)
        .then(response => response.json())
        .then(result => {
            if (result.search.length) {
                var queue = [];
                result.search.forEach((entity, index) => {
                    choices.push(entity);
                    entity.lang = lang;
                    queue.push(
                        fetch(wdk.sparqlQuery(instancesSPARQL(entity)))
                            .then(response => response.json())
                            .then(result => getInstances(result, entity))
                            .catch(e => console.error(colors.red(e)))
                    );
                    queue.push(
                        fetch(wdk.sparqlQuery(sitelinkSPARQL(entity)))
                            .then(response => response.json())
                            .then(result => getSitelink(result, entity))
                            .catch(e => console.error(colors.red(e)))
                    );
                });
                return Promise.all(queue);
            }
            throw new Error(`"${name}" not found`);
        })
        .then(() => showResults(choices))
        .catch(e => console.error(colors.red(e)))
        .then(nextMatch);
}


function showResults(choices) {
    choices.forEach((entity, index) => {
        console.log(
            colors.blue(`\n${index+1}. `),
            colors.green(`Matched: ${entity.label} (${entity.id})`)
        );

        if (entity.description) {
            console.log(`    "${entity.description}"`);
        }
        if (entity.instances) {
            console.log(`    instance of: [${entity.instances}]`);
        }
        if (entity.article) {
            console.log(`    article: ${entity.article}`);
        }

        console.log(colors.magenta(`    brand:wikidata = ${entity.id}`));
        console.log(colors.magenta(`    brand:wikipedia = ${entity.sitelink}`));
    });
}


function getInstances(result, entity) {
    const results = (result.results && result.results.bindings) || [];
    const instances = results.map(obj => obj.isaLabel.value);
    if (instances.length) {
        entity.instances = instances.join(', ');
    }
}

function getSitelink(result, entity) {
    const results = (result.results && result.results.bindings) || [];
    const article = results.length && results[0].article.value;
    if (article) {
        let page = decodeURIComponent(article).split('/').pop().replace(/\_/g, ' ');
        entity.article = article;
        entity.sitelink = entity.lang + ':' + page;
    }
}

function instancesSPARQL(entity) {
    return `SELECT ?isa ?isaLabel WHERE {
        wd:${entity.id} wdt:P31 ?isa.
        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en" .
        }
      }`;
}

function sitelinkSPARQL(entity) {
    return `SELECT ?article WHERE {
        ?article schema:about wd:${entity.id};
                 schema:isPartOf <https://${entity.lang}.wikipedia.org/>.
    }`;
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
