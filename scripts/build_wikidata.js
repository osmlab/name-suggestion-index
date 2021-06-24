// External
import colors from 'colors/safe.js';
import fs from 'node:fs';
import crypto from 'node:crypto';
import fetch from 'node-fetch';
import http from 'node:http';
import https from 'node:https';
import { iso1A2Code } from '@ideditor/country-coder';
import JSON5 from 'json5';
import localeCompare from 'locale-compare';
import LocationConflation from '@ideditor/location-conflation';
import shell from 'shelljs';
import stringify from '@aitodotai/json-stringify-pretty-compact';
import Twitter from 'Twitter';
import wikibase from 'wikibase-sdk';
import wikibaseEdit from 'wikibase-edit';
const withLocale = localeCompare('en-US');

// Internal
import { sortObject } from '../lib/sort_object.js';
import { fileTree } from '../lib/file_tree.js';
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';

// JSON
import packageJSON from '../package.json';
import treesJSON from '../config/trees.json';
const trees = treesJSON.trees;

// We use LocationConflation for validating and processing the locationSets
import featureCollectionJSON from '../dist/featureCollection.json';
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
// - connect to the Twitter API to fetch logos
// - connect to the Wikibase API to update NSI identifiers.
//
// `secrets.json` looks like this:
// {
//   "twitter": [
//     {
//       "twitter_consumer_key": "",
//       "twitter_consumer_secret": "",
//       "twitter_access_token_key": "",
//       "twitter_access_token_secret": ""
//     }, {
//       "twitter_consumer_key": "",
//       "twitter_consumer_secret": "",
//       "twitter_access_token_key": "",
//       "twitter_access_token_secret": ""
//     }
//   ],
//   "wikibase": {
//     "username": "my-wikidata-username",
//     "password": "my-wikidata-password"
//   }
// }

// ensure that the secrets file is not in /config anymore:
shell.config.silent = true;
shell.mv('-f', './config/secrets.json', './secrets.json');
shell.config.reset();

let _secrets;
try {
  _secrets = JSON5.parse(fs.readFileSync('./secrets.json', 'utf8'));
} catch (err) { /* ignore */ }

if (_secrets && !_secrets.twitter && !_secrets.wikibase) {
  console.error(colors.red('WHOA!'));
  console.error(colors.yellow('The `config/secrets.json` file format has changed a bit.'));
  console.error(colors.yellow('We were expecting to find `twitter` or `wikibase` properties.'));
  console.error(colors.yellow('Check `scripts/build_wikidata.js` for details...'));
  console.error('');
  process.exit(1);
}

// To fetch Twitter logos, sign up for API credentials at https://apps.twitter.com/
// and put them into `config/secrets.json`

let _twitterAPIs = [];
let _twitterAPIIndex = 0;
if (_secrets && _secrets.twitter) {
  _twitterAPIs = _secrets.twitter.map(s => {
    return new Twitter({
      consumer_key: s.twitter_consumer_key,
      consumer_secret: s.twitter_consumer_secret,
      access_token_key: s.twitter_access_token_key,
      access_token_secret: s.twitter_access_token_secret
    });
  });
}

// To update wikidata
// add your username/password into `config/secrets.json`
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
        _qidMetadata[qid] = { p31: 'Q4830453', what: 'business' };
      } else if (osmtag === 'flag') {
        _qidMetadata[qid] = { p31: 'Q14660', what: 'flag' };
      } else if (osmtag === 'network') {
        _qidMetadata[qid] = { p31: 'Q924286', what: 'transport network' };
      } else if (osmtag === 'subject') {
        _qidMetadata[qid] = { p31: 'Q43229', what: 'subject' };
      } else {
        _qidMetadata[qid] = { p31: 'Q43229', what: 'organization' };
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
  console.log(colors.yellow.bold(`\nBatch ${index+1}/${_urls.length}`));

  return fetch(currURL, fetchOptions)
    .then(response => {
      if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
      return response.json();
    })
    .then(result => processEntities(result))
    .catch(e => {
      console.warn(colors.green.bold('fetch error:'));
      console.warn(colors.white(JSON.stringify(e)));
      console.warn(colors.green.bold('retrying...'));
      backoff = true;
      --index;
    })
    .then(() => delay(backoff ? 5000 : 500))
    .then(() => doFetch(++index));
}


//
// `processEntities`
// Here we process the fetched results from the Wikidata API,
// then schedule followup API calls to the Twitter/Facebook APIs,
// then eventually resolves when all that work is done.
//
function processEntities(result) {
  let twitterQueue = [];
  let facebookQueue = [];
  let wbEditQueue = [];

  Object.keys(result.entities).forEach(qid => {
    const meta = _qidMetadata[qid];
    let target = _wikidata[qid];
    let entity = result.entities[qid];
    let label = entity.labels && entity.labels.en && entity.labels.en.value;

    if (Object.prototype.hasOwnProperty.call(entity, 'missing')) {
      label = enLabelForQID(qid) || qid;
      const msg = colors.yellow(`Error: https://www.wikidata.org/wiki/${qid}`) +
        colors.red(`  ⚠️  Entity for "${label}" was deleted.`);
      _warnings.push(msg);
      console.warn(msg);
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
        const msg = colors.yellow(`Warning: https://www.wikidata.org/wiki/${qid}`) +
          colors.red(`  Entity for "${label}" missing English label.`);
        _warnings.push(msg);
        console.warn(msg);
      }
    }

    // Get description...
    let description = entity.descriptions && entity.descriptions.en && entity.descriptions.en.value;
    if (description) {
      target.description = description;
    }

    // Get sitelinks to supply missing `*:wikipedia` tags - #4716, #4747
    if (entity.sitelinks) {
      checkWikipediaTags(qid, entity.sitelinks);
    }

    // Process claims below here...
    if (!entity.claims) return;
    target.logos = {};
    target.identities = {};
    target.dissolutions = [];


    let imageFile;
    if (meta.what === 'flag') {
      // P18 - Image (use this for flags)
      imageFile = getClaimValue(entity, 'P18');
    } else {
      // P154 - Logo Image
      // P8972 - Small Logo or Icon
      imageFile = getClaimValue(entity, 'P8972') || getClaimValue(entity, 'P154');
    }
    if (imageFile) {
      const re = /\.svg$/i;
      if (re.test(imageFile)) {
        imageFile = imageFile.replace(/\s/g, '_');   // 'Flag of Alaska.svg' -> 'Flag_of_Alaska.svg'
        const hash = crypto.createHash('md5').update(imageFile).digest('hex');
        const x = hash.slice(0, 1);
        const xx = hash.slice(0, 2);
        target.logos.wikidata = `https://upload.wikimedia.org/wikipedia/commons/${x}/${xx}/${imageFile}`;
      } else {
        target.logos.wikidata = 'https://commons.wikimedia.org/w/index.php?' +
          utilQsString({ title: `Special:Redirect/file/${imageFile}`, width: 150 });
      }
    }

    // P856 - official website
    const officialWebsite = getClaimValue(entity, 'P856');
    if (officialWebsite) {
      target.identities.website = officialWebsite;
    }

    // P2002 - Twitter username
    const twitterUser = getClaimValue(entity, 'P2002');
    if (twitterUser) {
      target.identities.twitter = twitterUser;
      twitterQueue.push({ qid: qid, username: twitterUser });    // queue logo fetch
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

    // P576 - Dissolution date
    if (meta.what !== 'flag' && meta.what !== 'subject') {
      wbk.simplify.propertyClaims(entity.claims.P576, { keepQualifiers: true }).forEach(item => {
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
          let msg = colors.yellow(`Warning: https://www.wikidata.org/wiki/${qid}`) +
            colors.red(`  ${target.label} might possibly be replaced by ${dissolution.upgrade}`);
          if (dissolution.countries) {
            msg += colors.red(`\nThis applies only to the following countries: ${JSON.stringify(dissolution.countries)}.`);
          }
          _warnings.push(msg);
          console.warn(msg);
        }
        target.dissolutions.push(dissolution);
      });
    }


    // If we are allowed to make edits to wikidata, continue beyond here
    if (!_wbEdit) return;

    // If P31 "instance of" is missing, set it to a resonable value.
    const instanceOf = getClaimValue(entity, 'P31');
    if (!instanceOf) {
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

  if (_twitterAPIs.length && twitterQueue.length) {
    return checkTwitterRateLimit(twitterQueue.length)
      .then(() => Promise.all( twitterQueue.map(obj => fetchTwitterUserDetails(obj.qid, obj.username)) ))
      .then(() => Promise.all( facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username)) ))
      .then(() => processWbEditQueue(wbEditQueue));
  } else {
    return Promise.all( facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username)) )
      .then(() => processWbEditQueue(wbEditQueue));
  }
}


// `getClaimValue`
// Get the claim value, considering any claim rank..
//   - disregard any claimes with an end date qualifier in the past
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


// `finish`
// Wrap up, write files
// - wikidata.json
// - dissolved.json
//
function finish() {
  const START = '🏗   ' + colors.yellow('Writing output files');
  const END = '👍  ' + colors.green('output files updated');
  console.log('');
  console.log(START);
  console.time(END);

  // update `wikidata.json` and `dissolved.json`
  let origWikidata;
  let dissolved = {};
  try {
    origWikidata = JSON5.parse(fs.readFileSync('./dist/wikidata.json', 'utf8')).wikidata;
  } catch (err) {
    origWikidata = {};
  }

  Object.keys(_wikidata).forEach(qid => {
    let target = _wikidata[qid];

    // if we haven't been able to access the Twitter API, don't overwrite the Twitter data - #3569
    if (!_twitterAPIs.length) {
      const origTarget = origWikidata[qid];
      ['identities', 'logos'].forEach(prop => {
        const origTwitter = origTarget && origTarget[prop] && origTarget[prop].twitter;
        if (origTwitter) {
          target[prop] = target[prop] || {};
          target[prop].twitter = origTwitter;
        }
      });
    }

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
    writeFileWithMeta('dist/wikidata.json', stringify({ wikidata: sortObject(_wikidata) }) + '\n');
    writeFileWithMeta('dist/dissolved.json', stringify({ dissolved: sortObject(dissolved) }, { maxLength: 100 }) + '\n');

    // Write filetree too, in case we updated some of these with `*:wikipedia` tags - #4716
    fileTree.write(_cache);
  }

  console.timeEnd(END);

  // output whatever errors we've gathered
  if (_warnings.length) {
    console.log(colors.yellow.bold(`\nError Summary:`));
    _warnings.forEach(msg => console.warn(colors.red(msg)));
  }
}


// check Twitter rate limit status
// https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
// rate limit: 900calls / 15min
function checkTwitterRateLimit(need) {
  _twitterAPIIndex = (_twitterAPIIndex + 1) % _twitterAPIs.length;
  const twitterAPI = _twitterAPIs[_twitterAPIIndex];
  const which = _twitterAPIs.length > 1 ? (' ' + (_twitterAPIIndex + 1)) : '';

  return twitterAPI
    .get('application/rate_limit_status', { resources: 'users' })
    .then(result => {
      const now = Date.now() / 1000;
      const stats = result.resources.users['/users/show/:id'];
      const resetSec = Math.ceil(stats.reset - now) + 30;  // +30sec in case server time is different
      console.log(colors.green.bold(`Twitter rate status${which}: need ${need}, remaining ${stats.remaining}, resets in ${resetSec} seconds...`));
      if (need > stats.remaining) {
        const delaySec = clamp(resetSec, 10, 60);
        console.log(colors.green.bold(`Twitter rate limit exceeded, pausing for ${delaySec} seconds...`));
        return delaySec;
      } else {
        return 0;
      }
    })
    .then(sec => {
      if (sec > 0) {
        return delay(sec * 1000)
          .then(() => checkTwitterRateLimit(need));
      } else {
        return Promise.resolve();
      }
    })
    .catch(e => {
      console.warn(colors.green.bold(`Error: Twitter rate limit: ` + JSON.stringify(e)));
    });
}


// https://developer.twitter.com/en/docs/accounts-and-users/user-profile-images-and-banners.html
// https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-show
function fetchTwitterUserDetails(qid, username) {
  const target = _wikidata[qid];
  const twitterAPI = _twitterAPIs[_twitterAPIIndex];

  return twitterAPI
    .get('users/show', { screen_name: username })
    .then(user => {
      target.logos.twitter = user.profile_image_url_https.replace('_normal', '_bigger');
    })
    .catch(e => {
      const msg = colors.yellow(`Warning: https://www.wikidata.org/wiki/${qid}`) +
        colors.red(`  Twitter username @${username}: ${JSON.stringify(e)}`);
      _warnings.push(msg);
      console.warn(msg);
    });
}


// https://developers.facebook.com/docs/graph-api/reference/user/picture/
function fetchFacebookLogo(qid, username) {
  let target = _wikidata[qid];
  let logoURL = `https://graph.facebook.com/${username}/picture?type=large`;
  let userid;

  // Does this "username" end in a numeric id?  If so, fallback to it.
  const m = username.match(/-(\d+)$/);
  if (m) userid = m[1];

  return fetch(logoURL, fetchOptions)
    .then(response => {
      if (!response.ok) {
        return response.json();  // we should get a response body with more information
      }
      if (response.headers.get('content-md5') !== 'OMs/UjwLoIRaoKN19eGYeQ==') {  // question-mark image #2750
        target.logos.facebook = logoURL;
      }
      return {};
    })
    .then(json => {
      if (json && json.error && json.error.message) {
        throw new Error(json.error.message);
      }
      return true;
    })
    .catch(e => {
      if (userid) {
        target.identities.facebook = userid;
        return fetchFacebookLogo(qid, userid);   // retry with just the numeric id
      } else {
        const msg = colors.yellow(`Warning: https://www.wikidata.org/wiki/${qid}`) +
          colors.red(`  Facebook username @${username}: ${e}`);
        _warnings.push(msg);
        console.warn(msg);
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
      _warnings.push(e);
      console.warn(colors.red(e));
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
  console.log(colors.blue(`Updating Wikidata ${queue.length}:  ${msg}`));
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
        const msg = colors.yellow(`Warning: https://www.wikidata.org/wiki/${qid}  `) + colors.red(e);
        _warnings.push(msg);
        console.warn(msg);
      })
      .then(() => delay(300))
      .then(() => processWbEditQueue(queue));
  }
}


// `checkWikipediaTags`
// Look at the wikidata sitelinks for this qid and
// - assign `*:wikipedia` tags that are missing - #4716
// - correct `*:wikipedia` tags that look wrong - #4747
// Note, skip assigning `*:wikipedia` for 'flags' tree for now.
function checkWikipediaTags(qid, sitelinks) {
  // Convert sitelinks to OSM wikipedia tags..
  let wikis = {};
  Object.keys(sitelinks).forEach(code => {
    const sitelink = sitelinks[code];
    const site = sitelink.site;
    const title = sitelink.title;
    if (!site || !title) return null;

    const m = site.match(/(\w+)wiki$/);     // 'enwiki', 'dewiki', 'zh_yuewiki', etc
    if (!m) return null;
    if (m[1] === 'commons') return null;    // skip 'commonswiki'

    const lang = m[1].replace(/_/g, '-');   // 'zh_yue' -> 'zh-yue'
    wikis[lang] = `${lang}:${title}`;
  });

  const wikiCount = Object.keys(wikis).length;

  // which NSI items use this qid?
  Array.from(_qidItems[qid]).forEach(id => {
    const item = _cache.id.get(id);
    if (item.fromTemplate) return;  // skip items expanded from templates

    ['brand', 'operator', 'network'].forEach(osmkey => {
      const wd = item.tags[`${osmkey}:wikidata`];
      const wpOld = item.tags[`${osmkey}:wikipedia`];

      if (wd && (wd === qid)) {  // `*:wikidata` tag matches
        if (wpOld && !wikiCount) {            // there was a wikipedia sitelink... but there shouldn't be one for this wikidata qid
          delete item.tags[`${osmkey}:wikipedia`];
          const msg = colors.cyan(`${qid} "${item.displayName}" removing old tag "${osmkey}:wikipedia = ${wpOld}" (doesn't match this qid)`);
          _warnings.push(msg);
          console.warn(msg);
        } else if (wpOld && wikiCount) {        // there was a wikipedia sitelink...
          const m = wpOld.match(/^(\w+):/);     // check the language of it  ('en', 'de', 'zh-yue')
          if (m) {
            const lang = m[1];
            let wpNew = wikis[lang];
            if (wpNew && wpNew !== wpOld) {     // the sitelink we found for this language and qid is different, so replace it
              item.tags[`${osmkey}:wikipedia`] = wpNew;
              const msg = colors.cyan(`${qid} "${item.displayName}" updating tag "${osmkey}:wikipedia = ${wpNew}" (was "${wpOld})"`);
              _warnings.push(msg);
              console.warn(msg);
            }
          }
        } else if (!wpOld) {                    // there was no sitelink before...
          let wpNew = chooseWiki(item);         // so we will try to pick one
          if (wpNew) {
            item.tags[`${osmkey}:wikipedia`] = wpNew;
            const msg = colors.cyan(`${qid} "${item.displayName}" adding missing tag "${osmkey}:wikipedia = ${wpNew}"`);
            _warnings.push(msg);
            console.warn(msg);
          }
        }
      }
    });
  });


  // Attempt to guess what language this item is, and pick a reasonable wikipedia tag for it
  // This code is terrible and nobody should do this.
  function chooseWiki(item) {
    if (!wikiCount) return null;

    const cc = item.locationSet.include[0];   // first location in the locationSet
    if (typeof cc !== 'string') return null;

    const name = item.displayName;
    let tryLangs = ['en'];                    // always fallback to enwiki

    // https://en.wikipedia.org/wiki/Unicode_block
    if (/[\u0370-\u03FF]/.test(name)) {          // Greek
      tryLangs.push('el');
    } else if (/[\u0590-\u05FF]/.test(name)) {   // Hebrew
      tryLangs.push('he');
    } else if (/[\u0600-\u06FF]/.test(name)) {   // Arabic
      tryLangs.push('ar');
    } else if (/[\u0750-\u077F]/.test(name)) {   // Arabic
      tryLangs.push('ar');
    } else if (/[\u08A0-\u08FF]/.test(name)) {   // Arabic
      tryLangs.push('ar');
    } else if (/[\u0E00-\u0E7F]/.test(name)) {   // Thai
      tryLangs.push('th');
    } else if (/[\u1000-\u109F]/.test(name)) {   // Myanmar
      tryLangs.push('my');
    } else if (/[\u1100-\u11FF]/.test(name)) {   // Hangul
      tryLangs.push('ko');
    } else if (/[\u1700-\u171F]/.test(name)) {   // Tagalog
      tryLangs.push('tl');
    } else if (/[\u1800-\u18AF]/.test(name)) {   // Mongolian
      tryLangs.push('mn');
    } else if (/[\u1F00-\u1FFF]/.test(name)) {   // Greek
      tryLangs.push('el');
    } else if (/[\u3040-\u30FF]/.test(name)) {   // Hirgana or Katakana
      tryLangs.push('ja');
    } else if (/[\u3130-\u318F]/.test(name)) {   // Hangul
      tryLangs.push('ko');
    } else if (/[\uA960-\uA97F]/.test(name)) {   // Hangul
      tryLangs.push('ko');
    } else if (/[\uAC00-\uD7AF]/.test(name)) {   // Hangul
      tryLangs.push('ko');
    } else if (cc === 'de' || cc === 'at' || cc === 'ch') {     // German
      tryLangs.push('de');
    } else if (cc === 'fr' || cc === 'fx' || cc === 'be') {     // French
      tryLangs.push('fr');
    } else if (cc === 'es' || cc === 'mx' || cc === 'ar') {     // Spanish (better include Argentina here or they may get Arabic)
      tryLangs.push('es');
    } else if (cc === 'gr' || cc === 'cy') {    // Greek (note gr/el) (better include Cyprus here or they may get Welsh)
      tryLangs.push('el');
    } else if (cc === 'pt' || cc === 'br') {    // Portuguese
      tryLangs.push('pt');
    } else if (cc === 'ru' || cc === 'by') {    // Russian
      tryLangs.push('ru');
    } else if (cc === 'ua') {                   // Ukranian, then Russian (note ua/uk)
      tryLangs.push('ru', 'uk');
    } else if (cc === 'dk') {                   // Danish (note dk/da)
      tryLangs.push('da');
    } else if (cc === 'se') {                   // Swedish (note se/sv)
      tryLangs.push('sv');
    } else if (cc === 'cz') {                   // Czech (note cz/cs)
      tryLangs.push('cs');
    } else if (cc === 'jp') {                   // Japanese (note jp/ja)
      tryLangs.push('ja');
    } else if (cc === 'rs') {                   // Serbian (note rs/sr)
      tryLangs.push('sr');
    } else if (cc === 'in') {                   // India / Hindi
      tryLangs.push('hi');
    } else if (cc === 'hk') {                   // Cantonese, then Standard Chinese
      tryLangs.push('zh', 'zh-yue');
    } else if (cc === 'cn') {                   // Standard Chinese
      tryLangs.push('zh');
    } else if (cc === 'ca') {                   // Canada, pick English (so they don't end up with Catalan)
      tryLangs.push('en');
    } else {
      // Just guess the country code as the language code..
      // At this point we are hoping that rare wiki languages don't have articles for rare qids
      tryLangs.push(cc);
    }

    while (tryLangs.length) {
      const lang = tryLangs.pop();
      if (wikis[lang]) return wikis[lang];
    }

    // We've exhausted the guesses, just return the first wiki we find..
    for (const lang in wikis) {
      return wikis[lang];
    }

    return null;
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
