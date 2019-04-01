const clearConsole = require('clear');
const colors = require('colors/safe');
const fetch = require('node-fetch');
const fileTree = require('./lib/file_tree');
const wdk = require('wikidata-sdk');

let _brands = fileTree.read('brands');

let _errors = [];

let _wrongFormat = [];
let _deleted = [];
let _foundSitelink = [];
let _wrongLink = [];

let _wikidata = gatherQIDs(_brands);
let _qids = Object.keys(_wikidata);
let _total = _qids.length;
if (!_total) {
    console.log('Nothing to fetch');
    process.exit();
}

// split into several wikidata requests
let _urls = wdk.getManyEntities({
    ids: _qids,
    languages: ['en'],
    props: ['info', 'sitelinks'],
    format: 'json',
    // TODO: not yet supported, see https://github.com/maxlath/wikidata-sdk/pull/56
    // redirects: false
});

process.stdout.write('\nchecking and validating');
checkWikipedia(_brands);
doFetch().then(finish);


function gatherQIDs(brands) {
    let wikidata = {};
    Object.keys(brands).forEach(k => {
        ['brand:wikidata', 'operator:wikidata'].forEach(t => {
            let qid = brands[k].tags[t];
            if (qid) {
                if (/^Q\d+$/.test(qid)) {
                    wikidata[qid] = k;
                } else {
                    _wrongFormat.push([k, qid, t]);
                }
            }
        });
    });
    return wikidata;
}

// Additionally check for wrong formatted Wikipedia values
function checkWikipedia(brands) {
    Object.keys(brands).forEach(k => {
        ['brand:wikipedia', 'operator:wikipedia'].forEach(t => {
            let wp = brands[k].tags[t];
            if (wp && !/^[a-z_]{2,}:[^_]*$/.test(wp)) {
                _wrongFormat.push([k, wp, t]);
            }
        });
    });
}

function doFetch(index) {
    index = index || 0;
    if (index >= _urls.length) {
        clearConsole();
        return Promise.resolve();
    }

    // TODO: the 'redirects' parameter can be removed once https://github.com/maxlath/wikidata-sdk/pull/56 is merged
    let currURL = `${_urls[index]}&redirects=no`;

    process.stdout.write('.');

    return fetch(currURL)
        .then(response => response.json())
        .then(result => processEntities(result))
        .catch(e => {
            _errors.push(e);
            console.error(colors.red(e))
        })
        .then(() => delay(500))
        .then(() => doFetch(++index));
}


function processEntities(result) {
    Object.keys(result.entities).forEach(qid => {
        let target = _wikidata[qid];
        let entry = _brands[target];
        let entity = result.entities[qid];
        let sitelinks = getSitelinks(entity);

        let wikidata = {
          brand: entry.tags['brand:wikidata'],
          operator: entry.tags['operator:wikidata']
        }
        let wikipedia = {
          brand: entry.tags['brand:wikipedia'],
          operator: entry.tags['operator:wikipedia']
        }

        // Wikidata entity was either deleted or is a redirect
        if (typeof entity.missing !== 'undefined') {
            _deleted.push([target, qid, wikidata.brand == qid ? 'brand:wikidata' : 'operator:wikidata']);
        }


        // If there is a Wikidata entity specified but no Wikipedia article,
        // try to find a matching article from all possible sitelinks
        if (wikidata.brand && !wikipedia.brand && entity.sitelinks && sitelinks.length) {
            _foundSitelink.push([target, qid, 'brand:wikidata', sitelinks.join(', ')])
        }

        if (wikidata.operator && !wikipedia.operator && entity.sitelinks && sitelinks.length) {
            _foundSitelink.push([target, qid, 'operator:wikidata', sitelinks.join(', ')]);
        }


        // Check whether the linked Wikipedia article of the Wikidata entity is the correct one
        if (wikipedia.brand && wikidata.brand == qid) {
            let correct = correctSitelink(wikipedia.brand, entity.sitelinks);
            if (correct) {
                _wrongLink.push([target, qid, 'brand:wikidata', wikipedia.brand, correct]);
            }
        }

        if (wikipedia.operator && wikidata.operator == qid) {
            let correct = correctSitelink(wikipedia.operator, entity.sitelinks);
            if (correct) {
                _wrongLink.push([target, qid, 'operator:wikidata', wikipedia.operator, correct]);
            }
        }
    });
    return Promise.resolve();
}


function correctSitelink(wikipedia, sitelinks) {
    let wp = wikipedia.split(':', 2);
    let language = wp[0];
    let title = wp[1];

    let sitelink = sitelinks && sitelinks[`${language}wiki`];
    if (sitelink && title.localeCompare(sitelink.title) !== 0) {
        return `${language}:${sitelink.title}`;
    } else {
        return false;
    }
}

function getSitelinks(entity) {
  let sitelinks = [];
  if (entity.sitelinks) {
      Object.keys(entity.sitelinks).forEach(k => {
          let language = k.replace(/wiki/, '');
          if (!/^(ceb|commons)$/.test(language)) {
              sitelinks.push(`${language}:${entity.sitelinks[k].title}`);
          }
      });
  }
  return sitelinks;
}


function finish() {
    if (_errors.length) {
        console.log(colors.yellow.bold(`\nError Summary:`));
        _errors.forEach(msg => console.error(colors.red.bold(msg)));
    }

    if (_wrongFormat.length) {
        console.error(colors.yellow.bold(`\nError - Wrong format:`));
        console.error('To resolve these, make sure that the values are in the correct format');
        _wrongFormat.sort();
        _wrongFormat.forEach(msg => console.error(
          `${colors.yellow.bold(msg[0])}: ${colors.red.bold(msg[1])} (${colors.blue.bold(msg[2])}) is in a wrong format`
        ));
    }

    if (_deleted.length) {
        console.error(colors.yellow.bold(`\nError - Deleted Wikidata entities:`));
        console.error('To resolve these, either remove the Wikidata entity from the entry or create a new one and add the correct id of the entity');
        _deleted.sort();
        _deleted.forEach(msg => console.error(
          `${colors.yellow.bold(msg[0])}: ${colors.red.bold(msg[1])} (${colors.blue.bold(msg[2])}) does not exist`
        ));
    }

    if (_foundSitelink.length) {
        console.warn(colors.yellow.bold(`\nWarning - Matched Wikipedia articles:`));
        console.warn('To resolve these, add a sitelink to the correct entry');
        _foundSitelink.sort();
        _foundSitelink.forEach(msg => console.warn(
          `${colors.yellow.bold(msg[0])}: ${colors.yellow.bold(msg[1])} (${colors.blue.bold(msg[2])}) has sitelinks to ${colors.green.bold(msg[3])}`
        ));
    }

    if (_wrongLink.length) {
        console.warn(colors.yellow.bold(`\nWarning - Wrong Wikipedia article which is not linked to the Wikidata entity:`));
        console.warn('To resolve these, check whether the Wikidata or the Wikipedia value is wrong and correct one of them');
        _wrongLink.sort();
        _wrongLink.forEach(msg => console.warn(
          `${colors.yellow.bold(msg[0])}: ${colors.yellow.bold(msg[1])} (${colors.blue.bold(msg[2])}) is not linked to ${colors.red.bold(msg[3])} but to ${colors.green.bold(msg[4])}`
        ));
    }
}


function delay(msec) {
    return new Promise((resolve) => setTimeout(resolve, msec));
}
