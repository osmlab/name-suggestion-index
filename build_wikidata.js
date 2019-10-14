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
    });
} catch (err) { /* ignore */ }


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
    Object.keys(brands).forEach(kvnd => {
        ['brand:wikidata', 'operator:wikidata'].forEach(t => {
            let qid = brands[kvnd].tags[t];
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
        .then(response => {
            if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
            return response.json();
        })
        .then(result => processEntities(result))
        .catch(e => {
            _errors.push(e);
            console.error(colors.red(e));
        })
        .then(() => delay(500))
        .then(() => doFetch(++index));
}


function processEntities(result) {
    let twitterQueue = [];
    let facebookQueue = [];
    let countryCodesQueue = [];

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
        target.dissolutions = [];

        // P154 - Commons Logo (often not square)
        let wikidataLogo = getClaimValue(entity, 'P154');
        if (wikidataLogo) {
            target.logos.wikidata = 'https://commons.wikimedia.org/w/index.php?' +
                utilQsString({ title: `Special:Redirect/file/${wikidataLogo}`, width: 100 });
        }

        // P856 - official website
        let officialWebsite = getClaimValue(entity, 'P856');
        if (officialWebsite) {
            target.identities.website = officialWebsite;
        }

        // P2002 - Twitter username
        let twitterUser = getClaimValue(entity, 'P2002');
        if (twitterUser) {
            target.identities.twitter = twitterUser;
            twitterQueue.push({ qid: qid, username: twitterUser });    // queue logo fetch
        }

        // P2003 - Instagram ID
        let instagramUser = getClaimValue(entity, 'P2003');
        if (instagramUser) {
            target.identities.instagram = instagramUser;
        }

        // P2013 - Facebook ID
        let facebookUser = getClaimValue(entity, 'P2013');
        if (facebookUser) {
            target.identities.facebook = facebookUser;
            facebookQueue.push({ qid: qid, username: facebookUser });    // queue logo fetch
        }

        // P2397 - YouTube ID
        let youtubeUser = getClaimValue(entity, 'P2397');
        if (youtubeUser) {
            target.identities.youtube = youtubeUser;
        }

        // P2984 - Snapchat ID
        let snapchatUser = getClaimValue(entity, 'P2984');
        if (snapchatUser) {
            target.identities.snapchat = snapchatUser;
        }

        // P3185 - VK ID
        let vkUser = getClaimValue(entity, 'P3185');
        if (vkUser) {
            target.identities.vk = vkUser;
        }

        // P3836 - Pinterest ID
        let pinterestUser = getClaimValue(entity, 'P3836');
        if (pinterestUser) {
            target.identities.pinterest = pinterestUser;
        }

        // P4264 - LinkedIn Company ID
        let linkedinUser = getClaimValue(entity, 'P4264');
        if (linkedinUser) {
            target.identities.linkedin = linkedinUser;
        }

        // P576 - Dissolution date
        wdk.simplify.propertyClaims(entity.claims.P576, { keepQualifiers: true }).forEach(item => {
            let dissolution = {
              date: item.value
            };

            if (item.qualifiers) {
                // P17 - Countries where the brand is dissoluted
                let countries = item.qualifiers.P17;
                if (countries) {
                    dissolution.countries = countries;
                    countryCodesQueue.push({ qid: qid, index: target.dissolutions.length, countries: countries });
                }

                // P156 - followed by or P1366 - replaced by (successor)
                let successor = item.qualifiers.P156 || item.qualifiers.P1366;
                if (successor) {
                    dissolution.upgrade = successor;
                }
            }

            // P156 - followed by or P1366 - replaced by (successor)
            // Sometimes the successor is stored as a claim and not as a direct reference of the dissolution date claim
            let successor = getClaimValue(entity, 'P156') || getClaimValue(entity, 'P1366');
            // Only set the value if there is nothing set yet, as the reference value of the claim might be more detailed
            if (successor && successor.id && !dissolution.upgrade) {
                dissolution.upgrade = [ successor.id ];
            }

            if (dissolution.upgrade) {
                dissolution.upgrade.forEach((entity, index) => {
                    let keys = getKeysByQid(entity);
                    if (keys.length === 0) {
                        // If the brand is not yet in the index, show a warning to add it
                        let msg = `Error: ${qid}: ${target.label} should probably be replaced by ${entity}, but this entry is not yet present in the index.`;
                        if (dissolution.countries) {
                            msg += ' ';
                            msg += `This applies only to the following countries: ${JSON.stringify(dissolution.countries)}.`;
                        }
                        _errors.push(msg);
                        console.error(colors.red(msg));
                        dissolution.upgrade.splice(index, 1);
                    } else if (keys.length === 1) {
                        dissolution.upgrade[index] = keys[0];
                    } else if (keys.length > 1) {
                        let msg = `Error: ${qid}: ${target.label} should probably be replaced by ${entity}, but this applies to more than one entry in the index: ${JSON.stringify(keys)}.`;
                        if (dissolution.countries) {
                            msg += ' ';
                            msg += `This applies only to the following countries: ${JSON.stringify(dissolution.countries)}.`;
                        }
                        _errors.push(msg);
                        console.error(colors.red(msg));
                        dissolution.upgrade.splice(index, 1);
                    }
                });

                if (dissolution.upgrade.length === 0) {
                    delete dissolution.upgrade;
                }
            }

            target.dissolutions.push(dissolution);
        });
    });

    if (twitterAPIs.length && twitterQueue.length) {
        return checkTwitterRateLimit(twitterQueue.length)
            .then(() => Promise.all(
                twitterQueue.map(obj => fetchTwitterUserDetails(obj.qid, obj.username))
            ))
            .then(() => Promise.all(
                facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username))
            ))
            .then(() => Promise.all(
                countryCodesQueue.map(obj => fetchCountryCodes(obj.qid, obj.index, obj.countries))
            ));
    } else {
        return Promise.all(
            facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username))
        )
        .then(() => Promise.all(
              countryCodesQueue.map(obj => fetchCountryCodes(obj.qid, obj.index, obj.countries))
        ));
    }
}


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
        let c = entity.claims[prop][i];
        if (c.rank === 'deprecated') continue;
        if (c.mainsnak.snaktype !== 'value') continue;

        // skip if we find an end time qualifier - P582
        let ended = false;
        let qualifiers = (c.qualifiers && c.qualifiers.P582) || [];
        for (let j = 0; j < qualifiers.length; j++) {
            let q = qualifiers[j];
            if (q.snaktype !== 'value') continue;
            let enddate = wdk.wikidataTimeToDateObject(q.datavalue.value.time);
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


function finish() {
    console.log('\nwriting wikidata.json');
    console.time(colors.green('wikidata.json updated'));

    Object.keys(_wikidata).forEach(qid => {
        let target = _wikidata[qid];

        ['identities', 'logos', 'dissolutions'].forEach(prop => {
            if (target[prop] && Object.keys(target[prop]).length) {
                if (target[prop].constructor.name === 'Object') {
                    target[prop] = sort(target[prop]);
                }
            } else {
                delete target[prop];
            }
        });

        _wikidata[qid] = sort(target);
    });


    fs.writeFileSync('dist/wikidata.json', stringify({ wikidata: sort(_wikidata) }));
    console.timeEnd(colors.green('wikidata.json updated'));


    console.log('\nwriting dissolved.json');
    console.time(colors.green('dissolved.json updated'));

    let dissolved = {};

    Object.keys(_brands).forEach(kvnd => {
        let qid = _brands[kvnd].tags['brand:wikidata'];
        if (qid && _wikidata[qid].dissolutions && _wikidata[qid].dissolutions.length > 0) {
            dissolved[kvnd] = _wikidata[qid].dissolutions;
        }
    });

    fs.writeFileSync('dist/dissolved.json', stringify(sort(dissolved)));
    console.timeEnd(colors.green('dissolved.json updated'));


    if (_errors.length) {
        console.log(colors.yellow.bold(`\nError Summary:`));
        _errors.forEach(msg => console.error(colors.red(msg)));
    }
}


// Find the key(s) of items in the index by its QID set in 'brand:wikidata'
function getKeysByQid(qid) {
    let result = [];
    Object.keys(_brands).forEach(kvnd => {
        if (_brands[kvnd].tags['brand:wikidata'] === qid) {
            result.push(kvnd);
        }
    });
    return result;
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
            console.error(colors.red(`Error: Twitter rate limit: ` + JSON.stringify(e)));
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


// https://developers.facebook.com/docs/graph-api/reference/user/picture/
function fetchFacebookLogo(qid, username) {
    let target = _wikidata[qid];
    let logoURL = `https://graph.facebook.com/${username}/picture?type=large`;

    return fetch(logoURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.status + ' ' + response.statusText);
            }
            if (response.headers.get('content-md5') !== 'OMs/UjwLoIRaoKN19eGYeQ==') {  // question-mark image #2750
                target.logos.facebook = logoURL;
            }
            return true;
        })
        .catch(e => {
            let msg = `Error: Facebook username @${username} for ${qid}: ` + e;
            _errors.push(msg);
            console.error(colors.red(msg));
        });
}

// replace the reference to a country with its ISO 3166-1 alpha-2 code which is present as a claim of the entity
function fetchCountryCodes(qid, index, countries) {
    let target = _wikidata[qid];
    let url = wdk.getEntities({
      ids: countries,
      languages: [ 'en' ],
      props: [ 'claims' ],
      format: 'json'
    });

    return fetch(url)
        .then(response => response.json())
        .then(json => {
            let entities = json.entities;
            for (let entity of Object.keys(entities)) {
              // P297 - ISO 3166-1 alpha-2 code
              let code = entities[entity].claims.P297;
              if (!code) {
                  // the entity is likely not a country if no country code is present
                  let msg = `Error: ${qid}: the linked item ${entity} does not seem to be a country because there is no country code stored as a claim.`;
                  _errors.push(msg);
                  console.error(colors.red(msg));
              }
              countries[countries.indexOf(entity)] = wdk.simplify.propertyClaims(code)[0].toLowerCase();
              target.dissolutions[index].countries = countries;
            }
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
