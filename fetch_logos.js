const colors = require('colors/safe');
const fetch = require('node-fetch');
const fileTree = require('./lib/file_tree');
const wdk = require('wikidata-sdk');

// If you want to fetch Twitter logos, sign up for
// API credentials at https://apps.twitter.com/
// and put them into `config/secrets.json`
let twitterAPI;
try {
    // `config/secrets.json` should contain:
    // {
    //   "twitter_consumer_key": "",
    //   "twitter_consumer_secret": "",
    //   "twitter_access_token_key": "",
    //   "twitter_access_token_secret": ""
    // }
    const Twitter = require('twitter');
    const secrets = require('./config/secrets.json');
    twitterAPI = new Twitter({
        consumer_key: secrets.twitter_consumer_key,
        consumer_secret: secrets.twitter_consumer_secret,
        access_token_key: secrets.twitter_access_token_key,
        access_token_secret: secrets.twitter_access_token_secret
    });
} catch(err) { /* ignore */ }


// what to fetch
let _brands = fileTree.read('brands');
let _toFetch = gatherQIDs(_brands);
let _qids = Object.keys(_toFetch);
let _total = _qids.length;
if (!_total) {
    console.log('Nothing to fetch');
    process.exit();
}

// split into several wikidata requests
let _urls = wdk.getManyEntities({
    ids: _qids, languages: ['en'], props: ['info', 'claims'], format: 'json'
});

let _logos = {};
doFetch(0);


function gatherQIDs(brands) {
    let toFetch = {};
    Object.keys(brands).forEach(k => {
        const qid = brands[k].tags['brand:wikidata'];
        if (qid && /^Q\d+$/.test(qid)) {
            toFetch[qid] = toFetch[qid] || [];
            toFetch[qid].push(k);
        }
    });

    return toFetch;
}


function doFetch(index) {
    if (index >= _urls.length) {
        return finish();
    }

    let currURL = _urls[index];

    console.log(colors.yellow.bold(`batch ${index+1}/${_urls.length}`));

    fetch(currURL)
        .then(response => response.json())
        .then(processEntities)
        .catch(e => console.error(colors.red(e)))
        .then(delay(500))
        .then(() => { doFetch(++index); });
}


function processEntities(result) {
    let queue = [];

    Object.keys(result.entities).forEach(qid => {
        let entity = result.entities[qid];
        if (!entity.claims) return;

        let claim, value;

        // P154 - Commons Logo  (often not square)
        if (entity.claims.P154) {
            claim = entity.claims.P154[0];
            value = claim.mainsnak.datavalue.value;
            if (value) {
                _logos[qid] = _logos[qid] || {};
                _logos[qid].wikidata = 'https://commons.wikimedia.org/w/index.php?' +
                    utilQsString({ title: `Special:Redirect/file/${value}`, width: 100 });
            }
        }

        // P2002 - Twitter username
        if (entity.claims.P2002) {
            // https://developer.twitter.com/en/docs/accounts-and-users/user-profile-images-and-banners.html
            // https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-show
            // rate limit: 900calls / 15min
            claim = entity.claims.P2002[0];
            value = claim.mainsnak.datavalue.value;
            if (value && twitterAPI) {
                _logos[qid] = _logos[qid] || {};
                queue.push(
                    twitterAPI.get('users/show', { screen_name: value })
                        .then(user => {
                            _logos[qid].twitter = user.profile_image_url_https.replace('_normal', '_bigger');
                        })
                        .catch(e => {
                            console.error(colors.red(`Error: Twitter username @${value} for ${qid}: ` + JSON.stringify(e)))
                        })
                        .then(delay(500))
                );
            }
        }

        // P2013 - Facebook ID
        // P2003 - Instagram ID
        if (entity.claims.P2013 || entity.claims.P2003) {
            // https://developers.facebook.com/docs/graph-api/reference/user/picture/
            claim = (entity.claims.P2013 || entity.claims.P2003)[0];
            value = claim.mainsnak.datavalue.value;
            if (value) {
                _logos[qid] = _logos[qid] || {};
                _logos[qid].facebook = `https://graph.facebook.com/${value}/picture?type=square`;
            }
        }

        // others we may want to add someday
        // P2397 - YouTube ID
        // P2677 - LinkedIn ID
        // P3267 - Flickr ID
        // P3836 - Pintrest ID
    });

    return Promise.all(queue);
}


function finish() {
    // merge in the latest logos that were collected..
    Object.keys(_logos).forEach(qid => {
        _toFetch[qid].forEach(k => {
            _brands[k].logos = Object.assign((_brands[k].logos || {}), _logos[qid]);
        });
    });

    fileTree.write('brands', _brands);  // save updates
}


function delay(msec) {
    return new Promise((resolve) => setTimeout(resolve, msec));
}


function utilQsString(obj) {
    return Object.keys(obj).sort().map(function(key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
    }).join('&');
}

