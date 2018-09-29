const clearConsole = require('clear');
const colors = require('colors/safe');
const diacritics = require('diacritics');
const fetch = require('node-fetch');
const fs = require('fs');
const stringify = require('json-stringify-pretty-compact');
const wdk = require('wikidata-sdk');

const MAXCHOICE = 3;      // max number of choices to consider

let canonical = require('./config/canonical.json');
let _resolve = function() { };
let _keypress = function() { };

// process keypresses - https://stackoverflow.com/a/12506613/7620
let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', key => _keypress(key));


// start matching
let _enTags = false;
let _toMatch = getKeysToMatch();
let _total = _toMatch.length;
if (!_total) {
    console.log('Nothing to match');
    process.exit();
}

let _direction = 1;   // 1 forward, -1 backward
let _currIndex = 0;
let _currKey;
nextMatch();


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


function nextMatch() {
    _currIndex = clamp(_currIndex, 0, _toMatch.length - 1);
    _currKey = _toMatch[_currIndex];

    clearConsole();
    console.log(colors.yellow.bold(`[${_currIndex+1}/${_total}]: ${_currKey}`));

    const name = _currKey.split('|', 2)[1];
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
        .catch(e => {
            console.error(colors.red(e));
            _currIndex = _currIndex + _direction;
        })
        .then(nextMatch);
}


function showResults(choices) {
    clearConsole();
    console.log(colors.yellow.bold(`[${_currIndex+1}/${_total}]: ${_currKey}`));

    // only keep choices with wikidata and wikipedia tags
    choices = choices.filter(entity => entity.id && entity.sitelink);

    if (!choices.length) {
        throw new Error(`Wiki tags not found`);
    }

    let keymap = {};

    choices.forEach((entity, index) => {
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
        if (_enTags) {
            console.log(colors.magenta(`      brand:en = ${entity.label}`));
            console.log(colors.magenta(`      name:en = ${entity.label}`));
        }
    });

    const enStatus = _enTags ? 'ON' : 'OFF';
    console.log();
    console.log(colors.blue.bold(`']':  Next name`));
    console.log(colors.blue.bold(`'[':  Previous name`));
    console.log(colors.blue.bold(`'}':  Skip to next tag`));
    console.log(colors.blue.bold(`'{':  Skip to previous tag`));
    console.log(colors.blue.bold(`'e':  Toggle 'en:' tags (currently ${enStatus})`));
    console.log(colors.blue.bold(`'q':  Quit`));
    console.log(colors.blue.bold(`\nChoose: `));

    _keypress = function(key) {
        if (key === '\u0003' || key === 'q') {    // Quit or ctrl-c (end of text)
            console.log('');
            process.exit();

        } else if (key === ']' || key === ' ') {    // Next
            _direction = 1;
            _currIndex++;
            _resolve();

        } else if (key === '[') {    // Previous
            _direction = -1;
            _currIndex--;
            _resolve();

        } else if (key === '}') {                   // Skip to next tag
            let t1 = _currKey.split('|', 2)[0];
            let t2 = t1;
            while (t2 === t1) {  // increment past end of current tag
                _currIndex = (_currIndex === _toMatch.length - 1) ? 0 : _currIndex + 1;
                let k2 = _toMatch[_currIndex];
                t2 = k2.split('|', 2)[0];
            }
            _direction = 1;
            _resolve();

        } else if (key === '{') {                   // Skip to previous tag
            let t1 = _currKey.split('|', 2)[0];
            let t2 = t1;
            while (t2 === t1) {  // decrement past beginning of current tag
                _currIndex = (_currIndex === 0) ? _toMatch.length - 1 : _currIndex - 1;
                let k2 = _toMatch[_currIndex];
                t2 = k2.split('|', 2)[0];
            }
            t1 = t2;
            while (t2 === t1) {  // decrement past beginning of previous tag
                _currIndex = (_currIndex === 0) ? _toMatch.length - 1 : _currIndex - 1;
                let k2 = _toMatch[_currIndex] || '';
                t2 = k2.split('|', 2)[0];
            }
            // increment once
            _currIndex = (_currIndex === _toMatch.length - 1) ? 0 : _currIndex + 1;
            _direction = -1;
            _resolve();

        } else if (key === 'e') {                   // Toggle en: tags
            _enTags = !_enTags;
            _resolve();

        } else if (keymap[key]) {                   // Pressed a number for a choice
            // update tags
            let entity = keymap[key];
            let obj = canonical[_currKey];
            obj.tags['brand:wikidata'] = entity.id;
            obj.tags['brand:wikipedia'] = entity.sitelink;
            if (_enTags) {
                obj.tags['brand:wikidata'] = entity.label;
                obj.tags['brand:wikipedia'] = entity.label;
            }

            fs.writeFileSync('config/canonical.json', stringify(sort(canonical), { maxLength: 50 }));

            _direction = 1;
            _currIndex++;
            _resolve();
        }
    }

    return new Promise(resolve => { _resolve = resolve; });
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

//
// Clamp a number between min and max
//
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
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
