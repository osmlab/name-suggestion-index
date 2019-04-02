const colors = require('colors/safe');
const fetch = require('node-fetch');
const fileTree = require('./lib/file_tree');
const fs = require('fs-extra');
const sort = require('./lib/sort');
const stringify = require('json-stringify-pretty-compact');
const wdk = require('wikidata-sdk');

// If you want to fetch Twitter logos, sign up for
// API credentials at https://apps.twitter.com/
// and put them into `config/secrets.json`
let twitterAPIs = [];
let _twitterAPIIndex = 0;
try {
    // `config/secrets.json` can contain a single secret object,
    // or an array of secret objects like:
    // [{
    //   "twitter_consumer_key": "",
    //   "twitter_consumer_secret": "",
    //   "twitter_access_token_key": "",
    //   "twitter_access_token_secret": ""
    // }, {
    //   "twitter_consumer_key": "",
    //   "twitter_consumer_secret": "",
    //   "twitter_access_token_key": "",
    //   "twitter_access_token_secret": ""
    // }]
    const Twitter = require('twitter');
    let secrets = require('./config/secrets.json');
    secrets = [].concat(secrets);

    twitterAPIs = secrets.map(s => {
        return new Twitter({
            consumer_key: s.twitter_consumer_key,
            consumer_secret: s.twitter_consumer_secret,
            access_token_key: s.twitter_access_token_key,
            access_token_secret: s.twitter_access_token_secret
        });
    })
} catch(err) { /* ignore */ }


// what to fetch
let _brands = fileTree.read('brands');
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
    props: ['info', 'labels', 'descriptions', 'claims'],
    format: 'json'
});

let _errors = [];
doFetch().then(finish);


function gatherQIDs(brands) {
    let wikidata = {};
    Object.keys(brands).forEach(k => {
        ['brand:wikidata', 'operator:wikidata'].forEach(t => {
            let qid = brands[k].tags[t];
            if (qid && /^Q\d+$/.test(qid)) {
                wikidata[qid] = {};
            }
        });
    });

    return wikidata;
}


function doFetch(index) {
    index = index || 0;
    if (index >= _urls.length) {
        return Promise.resolve();
    }

    let currURL = _urls[index];

    console.log(colors.yellow.bold(`\nBatch ${index+1}/${_urls.length}`));

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
    let twitterQueue = [];

    Object.keys(result.entities).forEach(qid => {
        let target = _wikidata[qid];
        let entity = result.entities[qid];
        let label = entity.labels && entity.labels.en && entity.labels.en.value;
        let description = entity.descriptions && entity.descriptions.en && entity.descriptions.en.value;

        if (label) {
            target.label = label;
        }
        if (description) {
            target.description = description;
        }

        // process claims below here
        if (!entity.claims) return;
        target.logos = {};
        target.identities = {};

        let wikidataLogo = getClaimValue(entity, 'P154');
        let brandWebsite = getClaimValue(entity, 'P856');
        let twitterUser = getClaimValue(entity, 'P2002');
        let facebookUser = getClaimValue(entity, 'P2013');
        // others we may want to add someday
        // P2003 - Instagram ID
        // P2397 - YouTube ID
        // P2677 - LinkedIn ID
        // P3267 - Flickr ID
        // P3836 - Pintrest ID

        // P154 - Commons Logo (often not square)
        if (wikidataLogo) {
            target.logos.wikidata = 'https://commons.wikimedia.org/w/index.php?' +
                utilQsString({ title: `Special:Redirect/file/${wikidataLogo}`, width: 100 });
        }

        // P856 - brand website
        if (brandWebsite) {
            target.identities.website = brandWebsite;
        }

        // P2002 - Twitter username
        if (twitterUser) {
            target.identities.twitter = twitterUser;
            twitterQueue.push({ qid: qid, username: twitterUser });
        }

        // P2013 - Facebook ID
        // https://developers.facebook.com/docs/graph-api/reference/user/picture/
        if (facebookUser) {
            target.identities.facebook = facebookUser;
            target.logos.facebook = `https://graph.facebook.com/${facebookUser}/picture?type=large`;
        }
    });

    if (twitterAPIs.length && twitterQueue.length) {
        return checkTwitterRateLimit(twitterQueue.length)
            .then(() => Promise.all(
                twitterQueue.map(obj => fetchTwitterUserDetails(obj.qid, obj.username))
            ));
    } else {
        return Promise.resolve();
    }
}


// Get the claim value, considering any claim rank..
//   - disregard any claims with "deprecated" rank
//   - accept immediately any claim with "preferred" rank
//   - return the latest claim with "normal" rank
function getClaimValue(entity, prop) {
    if (!entity.claims) return;
    if (!entity.claims[prop]) return;

    let value, c;
    for (let i = 0; i < entity.claims[prop].length; i++) {
        c = entity.claims[prop][i];
        if (c.rank === 'deprecated') continue;
        if (c.mainsnak.snaktype !== 'value') continue;

        value = c.mainsnak.datavalue.value;
        if (c.rank === 'preferred') return value;  // return immediately
    }
    return value;
}


function finish() {
    console.log('\nwriting wikidata.json');
    console.time(colors.green('wikidata.json updated'));

    Object.keys(_wikidata).forEach(qid => {
        let target = _wikidata[qid];

        ['identities', 'logos'].forEach(prop => {
            if (target[prop] && Object.keys(target[prop]).length) {
                target[prop] = sort(target[prop]);
            } else {
                delete target[prop];
            }
        });

        _wikidata[qid] = sort(target);
    });


    fs.writeFileSync('dist/wikidata.json', stringify({ wikidata: sort(_wikidata) }));
    console.timeEnd(colors.green('wikidata.json updated'));

    if (_errors.length) {
        console.log(colors.yellow.bold(`\nError Summary:`));
        _errors.forEach(msg => console.error(colors.red(msg)));
    }
}


// check Twitter rate limit status
// https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
// rate limit: 900calls / 15min
function checkTwitterRateLimit(need) {
    _twitterAPIIndex = (_twitterAPIIndex + 1) % twitterAPIs.length;
    let twitterAPI = twitterAPIs[_twitterAPIIndex];
    let which = twitterAPIs.length > 1 ? (' ' + (_twitterAPIIndex + 1)) : '';

    return twitterAPI
        .get('application/rate_limit_status', { resources: 'users' })
        .then(result => {
            let now = Date.now() / 1000;
            let stats = result.resources.users['/users/show/:id'];
            let resetSec = Math.ceil(stats.reset - now) + 30;  // +30sec in case server time is different
            console.log(colors.green.bold(`Twitter rate status${which}: need ${need}, remaining ${stats.remaining}, resets in ${resetSec} seconds...`));
            if (need > stats.remaining) {
                let delaySec = clamp(resetSec, 10, 60);
                console.log(colors.blue(`Twitter rate limit exceeded, pausing for ${delaySec} seconds...`));
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
            console.error(colors.red(`Error: Twitter rate limit: ` + JSON.stringify(e)))
        });
}


// https://developer.twitter.com/en/docs/accounts-and-users/user-profile-images-and-banners.html
// https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-show
function fetchTwitterUserDetails(qid, username) {
    let target = _wikidata[qid];
    let twitterAPI = twitterAPIs[_twitterAPIIndex];

    return twitterAPI
        .get('users/show', { screen_name: username })
        .then(user => {
            target.logos.twitter = user.profile_image_url_https.replace('_normal', '_bigger');
        })
        .catch(e => {
            let msg = `Error: Twitter username @${username} for ${qid}: ` + JSON.stringify(e);
            _errors.push(msg);
            console.error(colors.red(msg));
        });
}


function delay(msec) {
    return new Promise((resolve) => setTimeout(resolve, msec));
}


// Clamp a number between min and max
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}


function utilQsString(obj) {
    return Object.keys(obj).sort().map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    }).join('&');
}

