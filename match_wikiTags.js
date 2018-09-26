const clearConsole = require('clear');
const colors = require('colors/safe');
const diacritics = require('diacritics');
const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');
const wdk = require('wikidata-sdk');

const MAXCHOICE = 3;      // max number of choices to consider
const FASTFORWARD = 50;   // number to skip ahead on fast forward

let canonical = require('./config/canonical.json');
let _resolver = function() { };
let keymap = {};   // map of keypresses -> entitys

// process keypresses - https://stackoverflow.com/a/12506613/7620
let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', key => {
    // ctrl-c (end of text)
    if (key === '\u0003' || key === 'q') {
        console.log('');
        process.exit();
    } else if (key === '\t') {
        _resolver(FASTFORWARD);
    } else if (key === ' ') {
        _resolver(1);
    } else if (keymap[key]) {
        // update tags
        let entity = keymap[key];
        canonical[entity.k].tags['brand:wikidata'] = entity.id;
        canonical[entity.k].tags['brand:wikipedia'] = entity.sitelink;
        keymap = {};
        fs.writeFileSync('config/canonical.json', stringify(sort(canonical), { maxLength: 50 }));
        _resolver(1);
    }
});


// start matching
let toMatch = getKeysToMatch();
let total = toMatch.length;
let count = 0;
nextMatch(1);


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
}


function nextMatch(advance) {
    advance = advance || 1;

    let k;
    while(advance--) {
        k = toMatch.shift();
        if (!k) {
            console.log('');
            process.exit();
        }
        count++;
    }

    clearConsole();
    console.log(colors.yellow.bold(`[${count}/${total}]: ${k}`));

    const name = k.split('|', 2)[1];
    const lang = 'en';
    const searchURL = wdk.searchEntities({
        search: name, lang: lang, limit: MAXCHOICE, format: 'json', uselang: 'en'
    });
    let choices = [];

    fetch(searchURL)
        .then(response => response.json())
        .then(result => {
            if (!result.search.length) {
                throw new Error(`"${name}" not found`);
            }
            let queue = [];
            result.search.forEach((entity, index) => {
                choices.push(entity);
                entity.k = k;
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
        })
        .then(() => showResults(choices))
        .catch(e => console.error(colors.red(e)))
        .then(advance => nextMatch(advance));
}


function showResults(choices) {
    // only keep choices with wikidata and wikipedia tags
    choices = choices.filter(entity => entity.id && entity.sitelink);

    if (!choices.length) {
        throw new Error(`Wiki tags not found`);
    }

    keymap = {};

    choices
        .forEach((entity, index) => {
            let key = '' + (index + 1);
            keymap[key] = entity;

            console.log(
                colors.blue.bold(`\n\'${key}\': `),
                colors.green(`Matched: ${entity.label} (${entity.id})`)
            );

            if (entity.description) {
                console.log(`      "${entity.description}"`);
            }
            if (entity.instances) {
                console.log(`      instance of: [${entity.instances}]`);
            }
            if (entity.article) {
                console.log(`      article: ${entity.article}`);
            }

            console.log(colors.magenta(`      brand:wikidata = ${entity.id}`));
            console.log(colors.magenta(`      brand:wikipedia = ${entity.sitelink}`));
        });

    console.log(colors.blue.bold('\n\'q\':      Quit'));
    console.log(colors.blue.bold('\'space\':  Skip ahead 1'));
    console.log(colors.blue.bold('\'tab\':    Skip ahead ' + FASTFORWARD));
    console.log(colors.blue.bold('\nChoose: '));
    return new Promise(resolve => { _resolver = resolve; });
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
    let sorted = {};
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
}


// Removes noise from the name so that we can compare
// similar names for catching duplicates.
function stemmer(name) {
    const noise = [
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
