// External
import chalk from 'chalk';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { iso1A2Code } from '@rapideditor/country-coder';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import LocationConflation from '@rapideditor/location-conflation';
import shell from 'shelljs';
import stringify from '@aitodotai/json-stringify-pretty-compact';
import wikibase from 'wikibase-sdk';
import wikibaseEdit from 'wikibase-edit';
const withLocale = localeCompare('en-US');

// Internal
import { sortObject } from '../lib/sort_object.js';
import { fileTree } from '../lib/file_tree.js';
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';

// JSON
import packageJSON from '../package.json' assert {type: 'json'};
import treesJSON from '../config/trees.json' assert {type: 'json'};
const trees = treesJSON.trees;

// We use LocationConflation for validating and processing the locationSets
import featureCollectionJSON from '../dist/featureCollection.json' assert {type: 'json'};
const loco = new LocationConflation(featureCollectionJSON);

const wbk = wikibase({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});

// set keepalive for all the connections - see #4948
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const fetchOptions = {
  agent: (url) => ((url.protocol === 'http:') ? httpAgent : httpsAgent)
};


// set to true if you just want to test what the script will do without updating Wikidata
const DRYRUN = false;


// First, try to load the user's secrets.
// This is optional but needed if you want this script to:
// - connect to the Wikibase API to update NSI identifiers.
//
// An OAuth 1.0a application is needed to obtain required credentials which can be registered via
// https://meta.wikimedia.org/wiki/Special:OAuthConsumerRegistration/propose/oauth1a
//
// `secrets.json` looks like this:
// {
//   "wikibase": {
//     "oauth": {
//       "consumer_key": "consumer-token",
//       "consumer_secret": "consumer-secret",
//       "token": "access-token",
//       "token_secret": "access-secret"
//     }
//   }
// }
shell.config.silent = true;
shell.mv('-f', './config/secrets.json', './secrets.json');
shell.config.reset();

let _secrets;
try {
  _secrets = JSON5.parse(fs.readFileSync('./secrets.json', 'utf8'));
} catch (err) { /* ignore */ }

if (_secrets && !_secrets.wikibase) {
  console.error(chalk.red('WHOA!'));
  console.error(chalk.yellow('The `./secrets.json` file format has changed a bit.'));
  console.error(chalk.yellow('We were expecting to find a `wikibase` property.'));
  console.error(chalk.yellow('Check `scripts/build_wikidata.js` for details...'));
  console.error('');
  process.exit(1);
}

if (_secrets.wikibase && !_secrets.wikibase.oauth) {
  console.error(chalk.red('WHOA!'));
  console.error(chalk.yellow('The `./secrets.json` file format has changed a bit.'));
  console.error(chalk.yellow('We were expecting to find an `oauth` property.'));
  console.error(chalk.yellow('Check `scripts/build_wikidata.js` for details...'));
  console.error('');
  process.exit(1);
}


// To update wikidata
// add your oauth credentials into `./secrets.json`
let _wbEdit;
if (_secrets && _secrets.wikibase) {
  _wbEdit = wikibaseEdit({
    instance: 'https://www.wikidata.org',
    credentials: _secrets.wikibase,
    summary: 'Updated name-suggestion-index related claims, see https://nsi.guide for project details.',
    userAgent: `${packageJSON.name}/${packageJSON.version} (${packageJSON.homepage})`,
  });
}


// what to fetch
let _cache = {};
fileTree.read(_cache, loco);
fileTree.expandTemplates(_cache, loco);


// Gather all QIDs referenced by any tag..
let _wikidata = {};
let _qidItems = {};       // any item referenced by a qid
let _qidIdItems = {};     // items where we actually want to update the NSI-identifier on wikidata
let _qidMetadata = {};
Object.keys(_cache.path).forEach(tkv => {
  const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
  const t = parts[0];

  const items = _cache.path[tkv].items;
  if (!Array.isArray(items) || !items.length) return;

  items.forEach(item => {
    const tags = item.tags;
    ['brand', 'flag', 'operator', 'network', 'subject'].forEach(osmtag => {
      const wdTag = `${osmtag}:wikidata`;
      const qid = tags[wdTag];
      if (!qid || !/^Q\d+$/.test(qid)) return;

      if (!_wikidata[qid])  _wikidata[qid] = {};
      if (!_qidItems[qid])  _qidItems[qid] = new Set();
      _qidItems[qid].add(item.id);

      // What to set P31 "instance of" to if missing
      if (osmtag === 'brand') {
        _qidMetadata[qid] = { what: 'business', p31: 'Q4830453' };
      } else if (osmtag === 'flag') {
        _qidMetadata[qid] = { what: 'flag', p31: 'Q14660' };
      } else if (osmtag === 'network') {
        _qidMetadata[qid] = { what: 'transport network', p31: 'Q924286' };
      } else if (osmtag === 'subject') {
        _qidMetadata[qid] = { what: 'subject' };  // skip p31, a subject can be anything - #7661
      } else {
        _qidMetadata[qid] = { what: 'organization',  p31: 'Q43229' };
      }

      const isMainTag = (wdTag === trees[t].mainTag);
      if (isMainTag) {
        if (!_qidIdItems[qid])  _qidIdItems[qid] = new Set();
        _qidIdItems[qid].add(item.id);
      }
    });
  });
});

let _qids = Object.keys(_wikidata);
let _total = _qids.length;
if (!_total) {
  console.log('Nothing to fetch');
  process.exit();
}

// Chunk into multiple wikidata API requests..
let _urls = wbk.getManyEntities({
  ids: _qids,
  languages: ['en'],
  props: ['info', 'labels', 'descriptions', 'claims', 'sitelinks'],
  format: 'json'
});

let _warnings = [];

doFetch()
  .then(() => delay(5000))
  .then(removeOldNsiClaims)
  .then(finish);


//
// `doFetch`
// Returns a Promise that keeps fetching Wikidata API requests recursively
// until there is nothing left to fetch, then returns a resolved Promise
//
function doFetch(index) {
  index = index || 0;
  if (index >= _urls.length) return Promise.resolve();

  let currURL = _urls[index];
  let backoff = false;
  console.log(chalk.yellow.bold(`\nBatch ${index+1}/${_urls.length}`));

  return fetch(currURL, fetchOptions)
    .then(response => {
      if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
      return response.json();
    })
    .then(result => processEntities(result))
    .catch(e => {
      console.warn(chalk.green.bold('fetch error:'));
      console.warn(chalk.white(JSON.stringify(e)));
      console.warn(chalk.green.bold('retrying...'));
      backoff = true;
      --index;
    })
    .then(() => delay(backoff ? 5000 : 500))
    .then(() => doFetch(++index));
}


//
// `processEntities`
// Here we process the fetched results from the Wikidata API,
// then schedule followup API calls to the Facebook API,
// then eventually resolves when all that work is done.
//
function processEntities(result) {
  let facebookQueue = [];
  let wbEditQueue = [];

  Object.keys(result.entities).forEach(qid => {
    const meta = _qidMetadata[qid];
    let target = _wikidata[qid];
    let entity = result.entities[qid];
    let label = entity.labels && entity.labels.en && entity.labels.en.value;

    if (!!entity.redirects) {
      const warning = { qid: qid, msg: `wikidata redirects to ${entity.redirects.to}` };
      console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
      _warnings.push(warning);
    }

    if (Object.prototype.hasOwnProperty.call(entity, 'missing')) {
      label = enLabelForQID(qid) || qid;
      const warning = { qid: qid, msg: `⚠️  Entity for "${label}" was deleted.` };
      console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
      _warnings.push(warning);
      return;
    }

    // Get label...
    if (label) {
      target.label = label;
    } else {
      // try to pick an English label.
      label = enLabelForQID(qid);
      if (label && _wbEdit) {   // if we're allowed to make edits, just set the label
        target.label = label;
        const msg = `Adding English label for ${qid}: ${label}`;
        wbEditQueue.push({ id: qid, language: 'en', value: label, msg: msg });

      } else {   // otherwise raise a warning for the user to deal with.
        label = label || qid;
        const warning = { qid: qid, msg: `Entity for "${label}" missing English label.` };
        console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
        _warnings.push(warning);
      }
    }

    // Get description...
    let description = entity.descriptions && entity.descriptions.en && entity.descriptions.en.value;
    if (description) {
      target.description = description;
    }

    // Process claims below here...
    if (!entity.claims) return;
    target.logos = {};
    target.identities = {};
    target.dissolutions = [];
    target.officialWebsites = [];


    let imageFile;
    if (meta.what === 'flag') {
      // P18 - Image (use this for flags)
      imageFile = getClaimValue(entity, 'P18');
    } else {
      // P8972 - Small Logo or Icon
      // P154 - Logo Image
      // P158 - Seal Image
      // P94 - Coat of Arms Image
      imageFile = getClaimValue(entity, 'P8972') ||
        getClaimValue(entity, 'P154') ||
        getClaimValue(entity, 'P158') ||
        getClaimValue(entity, 'P94');
    }
    if (imageFile) {
      const re = /\.svg$/i;
      if (re.test(imageFile)) {
        target.logos.wikidata = `https://commons.wikimedia.org/wiki/Special:FilePath/${imageFile}`;
      } else {
        target.logos.wikidata = 'https://commons.wikimedia.org/w/index.php?' +
          utilQsString({ title: `Special:Redirect/file/${imageFile}`, width: 150 });
      }
    }

    // P856 - official website
    const officialWebsites = getClaimValues(entity, 'P856', true);
    if (officialWebsites) {
      target.officialWebsites = officialWebsites;
    }

    // P856 - official website
    const officialWebsite = getClaimValue(entity, 'P856');
    if (officialWebsite) {
      target.identities.website = officialWebsite;
    }

    // P11707 - location URL match pattern
    const urlMatchPatterns = getClaimValues(entity, 'P11707', false);
    if (urlMatchPatterns) {
      target.urlMatchPatterns = urlMatchPatterns;
    }

    // P2002 - Twitter username
    const twitterUser = getClaimValue(entity, 'P2002');
    if (twitterUser) {
      target.identities.twitter = twitterUser;
    }

    // P2003 - Instagram ID
    const instagramUser = getClaimValue(entity, 'P2003');
    if (instagramUser) {
      target.identities.instagram = instagramUser;
    }

    // P2013 - Facebook ID
    const facebookUser = getClaimValue(entity, 'P2013');
    if (facebookUser) {
      target.identities.facebook = facebookUser;
      facebookQueue.push({ qid: qid, username: facebookUser });    // queue logo fetch
    }

    // P2397 - YouTube ID
    const youtubeUser = getClaimValue(entity, 'P2397');
    if (youtubeUser) {
      target.identities.youtube = youtubeUser;
    }

    // P11245 - YouTube Handle
    const youtubeHandle = getClaimValue(entity, 'P2397');
    if (youtubeHandle) {
      target.identities.youtubeHandle = youtubeHandle;
    }

    // P2984 - Snapchat ID
    const snapchatUser = getClaimValue(entity, 'P2984');
    if (snapchatUser) {
      target.identities.snapchat = snapchatUser;
    }

    // P3185 - VK ID
    const vkUser = getClaimValue(entity, 'P3185');
    if (vkUser) {
      target.identities.vk = vkUser;
    }

    // P3579 - Sina Weibo user ID
    const weiboUser = getClaimValue(entity, 'P3579');
    if (weiboUser) {
      target.identities.weibo = weiboUser;
    }

    // P3836 - Pinterest ID
    const pinterestUser = getClaimValue(entity, 'P3836');
    if (pinterestUser) {
      target.identities.pinterest = pinterestUser;
    }

    // P4264 - LinkedIn Company ID
    const linkedinUser = getClaimValue(entity, 'P4264');
    if (linkedinUser) {
      target.identities.linkedin = linkedinUser;
    }

    // P7085 - TikTok username
    const tiktokUser = getClaimValue(entity, 'P7085');
    if (tiktokUser) {
      target.identities.tiktok = tiktokUser;
    }

    // P7650 - Weixin (WeChat) ID
    const weixinUser = getClaimValue(entity, 'P7650');
    if (weixinUser) {
      target.identities.weixin = weixinUser;
    }

    // P576 - Dissolution date
    if (meta.what !== 'flag' && meta.what !== 'subject') {
      wbk.simplify.propertyClaims(entity.claims.P576, { keepQualifiers: true }).forEach(item => {
        if (!item.value) return;

        const excluding = item.qualifiers?.P1011 ?? [];
        if (excluding.includes('Q168678')) return;  // but skip if 'excluding' = 'brand name', see #9134

        let dissolution = { date: item.value };

        if (item.qualifiers) {
          // P17 - Countries where the brand is dissoluted
          const countries = item.qualifiers.P17;
          if (countries) {
            dissolution.countries = countries.map(code => iso1A2Code(code));
          }
          // P156 - followed by or P1366 - replaced by (successor)
          const successorQID = item.qualifiers.P156 || item.qualifiers.P1366;
          if (successorQID) {
            dissolution.upgrade = successorQID;
          }
        }

        if (!dissolution.upgrade) {
          // Sometimes the successor is stored as a claim and not as a direct reference of the dissolution date claim
          // Only set the value if there is nothing set yet, as the reference value of the claim might be more detailed
          // P156 - followed by or P1366 - replaced by (successor)
          let successor = getClaimValue(entity, 'P156') || getClaimValue(entity, 'P1366');
          if (successor && successor.id) {
            dissolution.upgrade = successor.id;
          }
        }

        if (dissolution.upgrade) {
          const warning = { qid: qid, msg: `${target.label} might possibly be replaced by ${dissolution.upgrade}` };
          if (dissolution.countries) {
            warning.msg += `\nThis applies only to the following countries: ${JSON.stringify(dissolution.countries)}.`;
          }
          console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
          _warnings.push(warning);
        }
        target.dissolutions.push(dissolution);
      });
    }


    // If we are allowed to make edits to wikidata, continue beyond here
    if (!_wbEdit) return;

    // If P31 "instance of" is missing, set it to a resonable value.
    const instanceOf = getClaimValue(entity, 'P31');
    if (!instanceOf && meta.p31) {
      const msg = `Setting P31 "instance of" = ${meta.p31} "${meta.what}" for ${qid}`;
      wbEditQueue.push({ qid: qid, id: qid, property: 'P31', value: meta.p31, msg: msg });
    }

    // If we want this qid to have an P8253 property ..
    if (_qidIdItems[qid]) {
      // P8253 - name-suggestion-index identifier
      // sort ids so claim order is deterministic, to avoid unnecessary updating
      const nsiIds = Array.from(_qidIdItems[qid])
        .sort(withLocale);
      const nsiClaims = wbk.simplify.propertyClaims(entity.claims.P8253, { keepAll: true, keepNonTruthy: true })
        .sort((a, b) => withLocale(a.value, b.value));

      // Include this reference on all our claims - #4648
      const references = [{ P248: 'Q62108705' }];   // 'stated in': 'name suggestion index'

      // Make the nsiClaims match the nsiIds...
      let i = 0;
      let msg;
      for (i; i < nsiClaims.length; i++) {
        const claim = nsiClaims[i];

        if (i < nsiIds.length) {   // match existing claims to ids, and force all ranks to 'normal'
          let msg;
          if (claim.value !== nsiIds[i] || claim.rank !== 'normal') {
            if (claim.value !== nsiIds[i]) {
              msg = `Updating NSI identifier for ${qid}: value ${claim.value} -> ${nsiIds[i]}`;
            } else if (claim.rank !== 'normal') {
              msg = `Updating NSI identifier for ${qid}: rank '${claim.rank}' -> 'normal'`;
            }
            wbEditQueue.push({ qid: qid, guid: claim.id, newValue: nsiIds[i], rank: 'normal', references: references, msg: msg });
          }
          if (!claim.references || !claim.references.length) {
            msg = `Updating NSI identifier reference for ${qid}`;
            wbEditQueue.push({ qid: qid, guid: claim.id, snaks: references[0], msg: msg });
          }

        } else {  // remove extra existing claims
          msg = `Removing NSI identifier for ${qid}: ${claim.value}`;
          wbEditQueue.push({ qid: qid, guid: claim.id, msg: msg });
        }
      }

      for (i; i < nsiIds.length; i++) {   // add new claims
        msg = `Adding NSI identifier for ${qid}: ${nsiIds[i]}`;
        wbEditQueue.push({ qid: qid, id: qid, property: 'P8253', value: nsiIds[i], rank: 'normal', references: references, msg: msg });
      }
    }

  });  // foreach qid

  return Promise.all( facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username)) )
    .then(() => processWbEditQueue(wbEditQueue));
}


// `getClaimValue`
// Get the claim value, considering any claim rank..
//   - disregard any claims with an end date qualifier in the past
//   - disregard any claims with "deprecated" rank
//   - accept immediately any claim with "preferred" rank
//   - return the latest claim with "normal" rank
function getClaimValue(entity, prop) {
  if (!entity.claims) return;
  if (!entity.claims[prop]) return;

  let value;
  for (let i = 0; i < entity.claims[prop].length; i++) {
    const c = entity.claims[prop][i];
    if (c.rank === 'deprecated') continue;
    if (c.mainsnak.snaktype !== 'value') continue;

    // skip if we find an end time qualifier - P582
    let ended = false;
    const qualifiers = (c.qualifiers && c.qualifiers.P582) || [];
    for (let j = 0; j < qualifiers.length; j++) {
      const q = qualifiers[j];
      if (q.snaktype !== 'value') continue;
      const enddate = wbk.wikibaseTimeToDateObject(q.datavalue.value.time);
      if (new Date() > enddate) {
        ended = true;
        break;
      }
    }
    if (ended) continue;

    value = c.mainsnak.datavalue.value;
    if (c.rank === 'preferred') return value;  // return immediately
  }
  return value;
}

// `getClaimValues`
// Get all the claim values
//   - optionally disregard any claims with an end date qualifier in the past
//   - optionally disregard any claims with "deprecated" rank
//   - push any claims with "preferred" rank to the front
function getClaimValues(entity, prop, includeDeprecated) {
  if (!entity.claims) return;
  if (!entity.claims[prop]) return;

  let values = [];
  for (let i = 0; i < entity.claims[prop].length; i++) {
    const c = entity.claims[prop][i];
    if (c.rank === 'deprecated' && !includeDeprecated) continue;
    if (c.mainsnak.snaktype !== 'value') continue;

    // skip if we find an end time qualifier - P582
    let ended = false;
    const qualifiers = (c.qualifiers && c.qualifiers.P582) || [];
    for (let j = 0; j < qualifiers.length; j++) {
      const q = qualifiers[j];
      if (q.snaktype !== 'value') continue;
      const enddate = wbk.wikibaseTimeToDateObject(q.datavalue.value.time);
      if (new Date() > enddate) {
        ended = true;
        break;
      }
    }
    if (ended && !includeDeprecated) continue;

    if (c.rank === 'preferred'){  // List preferred values first
      values.unshift(c.mainsnak.datavalue.value);
    } else {
      values.push(c.mainsnak.datavalue.value);
    }
  }
  return values;
}


// `finish`
// Wrap up, write files:
// - `warnings.json`
// - `wikidata.json`
// - `dissolved.json`
//
function finish() {
  const START = '🏗   ' + chalk.yellow('Writing output files');
  const END = '👍  ' + chalk.green('output files updated');
  console.log('');
  console.log(START);
  console.time(END);

  let dissolved = {};

  Object.keys(_wikidata).forEach(qid => {
    let target = _wikidata[qid];

    // sort the properties that we are keeping..
    ['identities', 'logos', 'dissolutions'].forEach(prop => {
      if (target[prop] && Object.keys(target[prop]).length) {
        if (target[prop].constructor.name === 'Object') {
          target[prop] = sortObject(target[prop]);
        }
      } else {
        delete target[prop];
      }
    });

    if (target.dissolutions) {
      _qidItems[qid].forEach(itemID => {
        dissolved[itemID] = target.dissolutions;
      });
    }

    _wikidata[qid] = sortObject(target);
  });

  // Set `DRYRUN=true` at the beginning of this script to prevent actual file writes from happening.
  if (!DRYRUN) {
    writeFileWithMeta('dist/warnings.json', stringify({ warnings: _warnings }) + '\n');
    writeFileWithMeta('dist/wikidata.json', stringify({ wikidata: sortObject(_wikidata) }) + '\n');
    writeFileWithMeta('dist/dissolved.json', stringify({ dissolved: sortObject(dissolved) }, { maxLength: 100 }) + '\n');
  }

  console.timeEnd(END);

  // `console.warn` whatever warnings we've gathered
  if (_warnings.length) {
    console.log(chalk.yellow.bold(`\nWarnings:`));
    _warnings.forEach(warning => console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg)));
  }
}


// https://developers.facebook.com/docs/graph-api/reference/user/picture/
function fetchFacebookLogo(qid, username) {
  let target = _wikidata[qid];
  let logoURL = `https://graph.facebook.com/${username}/picture?type=large`;
  let userid;

  // Does this "username" end in a numeric id?  If so, fallback to it.
  const m = username.match(/-(\d+)$/);
  if (m) userid = m[1];

  // Can specify no redirect to fetch json and speed up this process
  return fetch(`${logoURL}&redirect=0`, fetchOptions)
    .then(response => response.json())
    .then(json => {
      if (!json) return true;

      if (json.error && json.error.message) {
        throw new Error(json.error.message);
      }

      // Default profile pictures aren't useful to the index #2750
      if (json.data && !json.data.is_silhouette) {
        target.logos.facebook = logoURL;
      }
      return true;
    })
    .catch(e => {
      if (userid) {
        target.identities.facebook = userid;
        return fetchFacebookLogo(qid, userid);   // retry with just the numeric id
      } else {
        const warning = { qid: qid, msg: `Facebook username @${username}: ${e}` };
        console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
        _warnings.push(warning);
      }
    });
}


// `removeOldNsiClaims`
// Find all items in Wikidata with NSI identifier claims (P8253).
// Remove any old claims where we don't reference that QID anymore.
function removeOldNsiClaims() {
  if (!_wbEdit) return Promise.resolve();

  const query = `
    SELECT ?qid ?nsiId ?guid
    WHERE {
      ?qid    p:P8253  ?guid.
      ?guid  ps:P8253  ?nsiId.
    }`;

  return fetch(wbk.sparqlQuery(query), fetchOptions)
    .then(response => {
      if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
      return response.json();
    })
    .then(wbk.simplify.sparqlResults)
    .then(results => {
      let wbEditQueue = [];
      results.forEach(item => {
        if (!_qidIdItems[item.qid]) {
          const msg = `Removing old NSI identifier for ${item.qid}: ${item.nsiId}`;
          wbEditQueue.push({ qid: item.qid, guid: item.guid, msg: msg });
        }
      });
      return wbEditQueue;
    })
    .then(processWbEditQueue)
    .catch(e => {
      console.warn(chalk.red(e));
    });
}


// `processWbEditQueue`
// Perform any edits to Wikidata that we want to do.
// (Slow these down and run them sequentially with some delay).
//
// Set `DRYRUN=true` at the beginning of this script to prevent actual edits from happening.
//
function processWbEditQueue(queue) {
  if (!queue.length || !_wbEdit) return Promise.resolve();

  const request = queue.pop();
  const qid = request.qid;
  const msg = request.msg;
  console.log(chalk.blue(`Updating Wikidata ${queue.length}:  ${msg}`));
  delete request.qid;
  delete request.msg;

  if (DRYRUN) {
    return Promise.resolve()
      .then(() => processWbEditQueue(queue));

  } else {
    let task;
    if (request.guid && request.snaks) {
      task = _wbEdit.reference.set(request);        // update reference
    } else if (request.guid && request.newValue) {
      task = _wbEdit.claim.update(request);         // update claim
    } else if (request.guid && !request.newValue) {
      task = _wbEdit.claim.remove(request);         // remove claim
    } else if (!request.guid && request.id && request.property && request.value) {
      task = _wbEdit.claim.create(request);         // create claim
    } else if (!request.guid && request.id && request.language && request.value) {
      task = _wbEdit.label.set(request);            // set label
    }

    return task
      .catch(e => {
        const warning = { qid: qid, msg: e };
        console.warn(chalk.yellow(warning.qid.padEnd(12)) + chalk.red(warning.msg));
        _warnings.push(warning);
      })
      .then(() => delay(300))
      .then(() => processWbEditQueue(queue));
  }
}


// `enLabelForQID`
// Pick a value that should be suitable to use as an English label.
// If we are pushing edits to Wikidata, add en labels for items that don't have them.
function enLabelForQID(qid) {
  const meta = _qidMetadata[qid];
  const ids = Array.from(_qidItems[qid]);
  for (let i = 0; i < ids.length; i++) {
    const item = _cache.id.get(ids[i]);

    if (meta.what === 'flag') {
      if (looksLatin(item.tags.subject))  return `Flag of ${item.tags.subject}`;

    } else {
      // These we know are English..
      if (item.tags['name:en'])     return item.tags['name:en'];
      if (item.tags['brand:en'])    return item.tags['brand:en'];
      if (item.tags['operator:en']) return item.tags['operator:en'];
      if (item.tags['network:en'])  return item.tags['network:en'];

      // These we're not sure..
      if (looksLatin(item.tags.name))     return item.tags.name;
      if (looksLatin(item.tags.brand))    return item.tags.brand;
      if (looksLatin(item.tags.operator)) return item.tags.operator;
      if (looksLatin(item.tags.network))  return item.tags.network;
      if (looksLatin(item.displayName))   return item.displayName;
    }
  }

  return null;

  function looksLatin(str) {
    if (!str) return false;
    // nothing outside the latin unicode ranges
    return !/[^\u0020-\u024F\u1E02-\u1EF3]/.test(str);
  }
}


function delay(msec) {
  return new Promise(resolve => setTimeout(resolve, msec));
}


// Clamp a number between min and max
function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}


function utilQsString(obj) {
  return Object.keys(obj).sort(withLocale).map(key => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }).join('&');
}
