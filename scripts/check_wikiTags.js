const clearConsole = require('clear');
const colors = require('colors/safe');
const fetch = require('node-fetch');
const fileTree = require('../lib/file_tree.js');

const wbk = require('wikibase-sdk')({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});

const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

let _cache = { path: {}, id: {} };
fileTree.read('brands', _cache, loco);
fileTree.read('operators', _cache, loco);
fileTree.read('transit', _cache, loco);

let _errors = [];
let _wrongFormat = [];
let _deletedWikidata = [];
let _deletedWikipedia = [];
let _foundSitelink = [];
let _wrongLink = [];
let _wrongEntity = [];
let _missingInstance = [];
let _missingReferences = [];

let _data = gatherData(_cache);

let _urls = {
  wikidata: wbk.getManyEntities({
    ids: Object.keys(_data.wikidata),
    languages: ['en'],
    props: ['info', 'claims', 'sitelinks'],
    format: 'json',
    redirects: false
  }),
  wikipedia: getWikipediaUrls(
    Object.keys(_data.wikipedia)
  )
};

process.stdout.write('\nchecking and validating');

doFetch(null, _urls.wikidata, checkWikidata)
  .then(doFetch(null, _urls.wikipedia, checkWikipedia))
  .then(finish);


// Find all wikidata QIDs and wikipedia articles set as values in all entries
function gatherData(tree) {
  let wikidata = {};
  let wikipedia = {};

  Object.keys(tree.path).forEach(tkv => {
    tree.path[tkv].forEach(item => {
      ['brand:wikidata', 'operator:wikidata', 'network:wikidata'].forEach(t => {
        let qid = item.tags[t];
        if (qid && /^Q\d+$/.test(qid)) {
          wikidata[qid] = item.id;
        } else if (qid) {
          _wrongFormat.push([item.id, qid, t]);
        }
      });

      ['brand:wikipedia', 'operator:wikipedia', 'network:wikipedia'].forEach(t => {
        let wp = item.tags[t];
        if (wp && /^[a-z_]{2,}:[^_]*$/.test(wp)) {
          wikipedia[wp] = item.id;
        } else if (wp) {
          _wrongFormat.push([item.id, wp, t]);
        }
      });
    });
  });

  return { wikidata, wikipedia };
}

function getWikipediaUrls(values) {
  let titles = {};
  let result = [];

  // Separate the title by its language and the actual title
  values.forEach(value => {
    let [ language, title ] = value.split(':', 2);
    if (!titles[language]) {
      titles[language] = [];
    }
    titles[language].push(title);
  });

  Object.keys(titles).forEach(language => {
    // The API does not accept more than 50 titles at once, so the array of titles needs to be split into chunks
    chunk(titles[language], 50).forEach(values => {
      result.push(
        `https://${language}.wikipedia.org/w/api.php?action=query&prop=info|pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(values.join('|'))}&format=json`
      );
    });
  });

  return result;
}


function doFetch(index, urls, check) {
  index = index || 0;
  if (index >= urls.length) {
    return Promise.resolve();
  }

  let url = urls[index];

  process.stdout.write('.');

  return fetch(url, {
    headers: {
      // Setting a resonable User-Agent is required in order to access the Wikipedia API
      // see https://meta.wikimedia.org/wiki/User-Agent_policy
      'User-Agent': 'name-suggestion-index (https://github.com/osmlab/name-suggestion-index)'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  })
  .then(check)
  .catch(e => {
    _errors.push(e);
    console.error(colors.red(e));
  })
  .then(() => delay(500))
  .then(() => doFetch(++index, urls, check));
}


function checkWikidata(result) {
  // blacklist containing wrong claims for entities which are brands
  // and an additional message on how to deal with them
  let blacklist = {
      // P625 - coordinate location
      P625: "If this value describes the location of the headquarter of the brand, then add this as a qualifier for P159 (headquarters location) and remove this claim."
  };

  Object.keys(result.entities).forEach(qid => {
    let entity = result.entities[qid];
    let target = _data.wikidata[qid];
    let entry = _cache.id[target];

    let sitelinks = getSitelinks(entity);
    let claims = wbk.simplify.claims(entity.claims, { keepReferences: true });
    let instance = entity.claims && entity.claims.P31;

    let tag = Object.keys(entry.tags).find(key => entry.tags[key] === qid).split(':')[0];
    let wikipedia = entry.tags[`${tag}:wikipedia`];

    // Wikidata entity was either deleted or is a redirect
    if (entity.missing === '') {
      return _deletedWikidata.push([entry.displayName, entry.id, qid, `${tag}:wikidata`]);
    }

    // If there is a Wikidata entity specified but no Wikipedia article,
    // try to find a matching article from all possible sitelinks
    if (!wikipedia && sitelinks.length) {
      _foundSitelink.push([entry.displayName, entry.id, qid, `${tag}:wikidata`, sitelinks.join(', ')]);
    }

    if (wikipedia) {
      // Check whether the linked Wikipedia article of the Wikidata entity is the correct one
      let correct = getCorrectSitelink(wikipedia, entity.sitelinks);
      if (correct) {
        _wrongLink.push([entry.displayName, entry.id, qid, `${tag}:wikidata`, wikipedia, correct]);
      }
    }

    // Check if there are any blacklisted claims
    Object.keys(blacklist).forEach(property => {
      if (claims[property]) {
        _wrongEntity.push([entry.displayName, entry.id, qid, `${tag}:wikidata`, property, blacklist[property]]);
      }
    });

    // Entries without any sitelinks have a high risk of being deleted
    if (!sitelinks.length) {
      // Warn if there are no instance claims and no sitelinks
      if (!instance) {
        _missingInstance.push([entry.displayName, entry.id, qid, `${tag}:wikidata`]);
      }

      // Warn if there are no references and no sitelinks
      let references = getReferences(claims);
      if (!references.length) {
        _missingReferences.push([entry.displayName, entry.id, qid, `${tag}:wikidata`]);
      }
    }
  });

  return Promise.resolve();
}


function checkWikipedia(result) {
  Object.keys(result.query.pages).forEach(id => {
    let page = result.query.pages[id];
    let iwl = `${page.pagelanguage}:${page.title}`;
    let target = _data.wikipedia[iwl];
    let entry = _cache.id[target];

    if (!entry) {
      return;
    }

    let tag = Object.keys(entry.tags).find(key => entry.tags[key] === iwl).split(':')[0];
    let wikidata = entry.tags[`${tag}:wikidata`];

    // Wikipedia page has been deleted or is a redirect
    if (page.missing === '' || page.redirect === '') {
      return _deletedWikipedia.push([entry.displayName, entry.id, iwl, wikidata, `${tag}:wikipedia`]);
    }

    // Check whether the (local) linked Wikidata entity of the Wikipedia article is the correct one
    if (page.pageprops && page.pageprops.wikibase_item !== wikidata) {
      _wrongLink.push([entry.displayName, entry.id, iwl, `${tag}:wikipedia`, wikidata, page.pageprops.wikibase_item]);
    }
  });

  return Promise.resolve();
}


// Checks whether the currently used sitelink to Wikipedia is really the correct one
// and returns the correct sitelink if the current sitelink is wrong
function getCorrectSitelink(wikipedia, sitelinks) {
  let [ language, title ] = wikipedia.split(':', 2);
  let sitelink = sitelinks && sitelinks[`${language}wiki`];
  if (sitelink && title.localeCompare(sitelink.title) !== 0) {
    return `${language}:${sitelink.title}`;
  }
}

// Get all sitelinks of an entity but filter out some wikis with low or no information gain
function getSitelinks(entity) {
  let sitelinks = [];
  if (entity.sitelinks) {
    Object.keys(entity.sitelinks).forEach(k => {
      let language = k.replace(/wiki/, '');
      if (!/^(ceb|commons|simple)$/.test(language)) {
        sitelinks.push(`${language}:${entity.sitelinks[k].title}`);
      }
    });
  }
  return sitelinks;
}

function getReferences(claims) {
  let references = [];
  Object.keys(claims).forEach(claim => {
    claims[claim].forEach(value => {
      references = references.concat(value.references);
    });
  });
  return references;
}


function finish() {
  clearConsole();

  if (_errors.length) {
    console.log(colors.yellow.bold(`\nError Summary:`));
    _errors.forEach(msg => console.error(colors.red.bold(msg)));
  }

  if (_wrongFormat.length) {
    console.error(colors.yellow.bold(`\nError - Wrong format:`));
    console.error('To resolve these, make sure that the values are in the correct format');
    _wrongFormat.sort();
    _wrongFormat.forEach(msg => console.error(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.red.bold(msg[2])} (${colors.blue.bold(msg[3])}) is in a wrong format`
    ));
    console.error('total ' + _wrongFormat.length);
  }

  if (_deletedWikidata.length) {
    console.error(colors.yellow.bold(`\nError - Deleted Wikidata entities:`));
    console.error('To resolve these, either remove the Wikidata entity from the entry or create a new one and add the correct id of the entity');
    _deletedWikidata.sort();
    _deletedWikidata.forEach(msg => console.error(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.red.bold(msg[2])} (${colors.blue.bold(msg[3])}) does not exist or is a redirect`
    ));
    console.error('total ' + _deletedWikidata.length);
  }

  if (_deletedWikipedia.length) {
    console.error(colors.yellow.bold(`\nError - Deleted Wikipedia articles:`));
    console.error('To resolve these, either remove the Wikipedia article from the entry or create a new one and add the correct link to the article');
    _deletedWikipedia.sort();
    _deletedWikipedia.forEach(msg => console.error(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.red.bold(msg[2])} (${msg[3]}) (${colors.blue.bold(msg[4])}) does not exist or is a redirect`
    ));
    console.error('total ' + _deletedWikipedia.length);
  }

  if (_foundSitelink.length) {
    console.warn(colors.yellow.bold(`\nWarning - Matched Wikipedia articles:`));
    console.warn('To resolve these, add a sitelink to the correct entry');
    _foundSitelink.sort();
    _foundSitelink.forEach(msg => console.warn(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.yellow.bold(msg[2])} (${colors.blue.bold(msg[3])}) has sitelinks to ${colors.green.bold(msg[4])}`
    ));
    console.warn('total ' + _foundSitelink.length);
  }

  if (_wrongLink.length) {
    console.warn(colors.yellow.bold(`\nWarning - Wrong Wikipedia article which is not linked to the Wikidata entity:`));
    console.warn('To resolve these, check whether the Wikidata or the Wikipedia value is wrong and correct one of them');
    _wrongLink.sort();
    _wrongLink.forEach(msg => console.warn(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.yellow.bold(msg[2])} (${colors.blue.bold(msg[3])}) is not linked to ${colors.red.bold(msg[4])} but to ${colors.green.bold(msg[5])}`
    ));
    console.warn('total ' + _wrongLink.length);
  }

  if (_wrongEntity.length) {
    console.warn(colors.yellow.bold(`\nWarning - Possibly wrong linked Wikidata entity:`));
    console.warn('To resolve these, check whether the Wikidata entity really describes the brand and not something else or follow the hint on how to fix the entry');
    _wrongEntity.sort();
    _wrongEntity.forEach(msg => console.warn(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.yellow.bold(msg[2])} (${colors.blue.bold(msg[3])}) ${colors.red.bold(msg[4])}: ${msg[5]}`
    ));
    console.warn('total ' + _wrongEntity.length);
  }

  if (_missingInstance.length) {
    console.warn(colors.yellow.bold(`\nWarning - Missing sitelink and instance claim (P31) which might lead to a deletion in the future:`));
    console.warn('To resolve these, add an instance claim (P31) or a sitelink to the Wikidata item');
    _missingInstance.sort();
    _missingInstance.forEach(msg => console.warn(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.yellow.bold(msg[2])} (${colors.blue.bold(msg[3])}) is missing a sitelink and an instance claim (P31)`
    ));
    console.warn('total ' + _missingInstance.length);
  }

  if (_missingReferences.length) {
    console.warn(colors.yellow.bold(`\nWarning - Missing sitelink and external references which might lead to a deletion in the future:`));
    console.warn('To resolve these, add a reference to an external source or a sitelink to the Wikidata item');
    _missingReferences.sort();
    _missingReferences.forEach(msg => console.warn(
      `${colors.cyan.bold(msg[0])} (${colors.yellow.bold(msg[1])}): ${colors.yellow.bold(msg[2])} (${colors.blue.bold(msg[3])}) is missing a sitelink and a reference`
    ));
    console.warn('total ' + _missingReferences.length);
  }
}


function delay(msec) {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

function chunk(input, size) {
  let result = [];
  let index = 0;
  while (index < input.length) {
    result.push(input.slice(index, size + index));
    index += size;
  }
  return result;
}
