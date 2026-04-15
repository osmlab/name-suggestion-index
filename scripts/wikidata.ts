/* eslint-disable dot-notation, @typescript-eslint/no-explicit-any */
import { $ } from 'bun';
import { iso1A2Code } from '@rapideditor/country-coder';
import localeCompare from 'locale-compare';
import LocationConflation from '@rapideditor/location-conflation';
import stringify from 'json-stringify-pretty-compact';
import { styleText } from 'node:util';
import wikibase, { type CustomSimplifiedClaim, type ItemId, type PropertyId } from 'wikibase-sdk';
import wikibaseEdit, { type WikibaseEditAPI } from 'wikibase-edit';
const withLocale = localeCompare('en-US');  // specify 'en-US' for stable results

import type { NsiCache } from '../lib/types.ts';
import { fileTree } from '../lib/file_tree.ts';
import { sortObject } from '../lib/sort_object.ts';


// set to true if you just want to test what the script will do without updating Wikidata
const DRYRUN = false;

// Types for the Wikidata API responses and internal data structures
interface Warning {
  qid: ItemId;
  msg: string;
}

interface QidMetadata {
  what: 'business' | 'flag' | 'transport network' | 'subject' | 'organization';
  p31?: ItemId;
}

interface WikidataProps {
  label?: string;
  description?: string;
  logos?: Record<string, string>;
  identities?: Record<string, string>;
  dissolutions?: Dissolution[];
  officialWebsites?: string[];
  urlMatchPatterns?: string[];
  locationInfoWebsites?: string[];
}

interface Dissolution {
  date: string;
  countries?: string[];
  upgrade?: ItemId;
}

interface WbEditRequest {
  qid?: ItemId;
  msg?: string;
  id?: ItemId;
  guid?: string;
  property?: PropertyId;
  value?: string;
  newValue?: string;
  rank?: string;
  language?: string;
  snaks?: Record<string, string>;
  references?: Record<string, string>[];
}

// Derive wikibase-edit param types from the exported API (they aren't re-exported directly)
type SetReferenceParams = Parameters<WikibaseEditAPI['reference']['set']>[0];
type UpdateClaimParams = Parameters<WikibaseEditAPI['claim']['update']>[0];
type RemoveClaimParams = Parameters<WikibaseEditAPI['claim']['remove']>[0];
type CreateClaimParams = Parameters<WikibaseEditAPI['claim']['create']>[0];
type TermActionParams = Parameters<WikibaseEditAPI['label']['set']>[0];

interface FacebookQueueItem {
  qid: ItemId;
  username: string;
  restriction: ItemId | undefined;
}

// Wikidata entity shapes are controlled by the Wikidata API — use Record<string, any> at the boundary
type WdEntity = Record<string, any>;
interface WdApiResult { entities: Record<string, WdEntity> }


// JSON
const packageJSON = await Bun.file('./package.json').json();
const treesJSON = await Bun.file('./config/trees.json').json();
const trees = treesJSON.trees;

// We use LocationConflation for validating and processing the locationSets
let featureCollectionJSON;
try {
  featureCollectionJSON = await Bun.file('./dist/json/featureCollection.json').json();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(styleText('red', `Error: ${message} `));
  console.error(styleText('yellow', `Please run 'bun run build' first.`));
  process.exit(1);
}
const _loco = new LocationConflation(featureCollectionJSON);

const wbk = wikibase({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
});

const USER_AGENT = `${packageJSON.name}/${packageJSON.version} (${packageJSON.homepage})`;
const MAX_RETRIES = 5;
const FETCH_OPTS = { headers: new Headers({ 'User-Agent': USER_AGENT }) };
const LATIN_TAG_PATTERNS = [
  /^name:[a-z]+-Latn(-[a-z]+)?$/,
  /^brand:[a-z]+-Latn(-[a-z]+)?$/,
  /^operator:[a-z]+-Latn(-[a-z]+)?$/,
  /^network:[a-z]+-Latn(-[a-z]+)?$/,
];

// Start fresh
$.nothrow();  // If a shell command returns nonzero, keep going.
if (!DRYRUN) {
  await $`rm -rf ./dist/wikidata`;
}

console.log(styleText('blue', '-'.repeat(70)));
console.log(styleText('blue', '📓  Build Wikidata cache'));
console.log(styleText('blue', '-'.repeat(70)));

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

let _secrets;
try {
  _secrets = await Bun.file('./secrets.json').json();
} catch (err) { /* ignore */ }

if (_secrets && !_secrets.wikibase) {
  console.error(styleText('red', 'WHOA!'));
  console.error(styleText('yellow', 'The `./secrets.json` file format has changed a bit.'));
  console.error(styleText('yellow', 'We were expecting to find a `wikibase` property.'));
  console.error(styleText('yellow', 'Check `scripts/wikidata.ts` for details...'));
  console.error('');
  process.exit(1);
}

if (_secrets && _secrets.wikibase && !_secrets.wikibase.oauth) {
  console.error(styleText('red', 'WHOA!'));
  console.error(styleText('yellow', 'The `./secrets.json` file format has changed a bit.'));
  console.error(styleText('yellow', 'We were expecting to find an `oauth` property.'));
  console.error(styleText('yellow', 'Check `scripts/wikidata.ts` for details...'));
  console.error('');
  process.exit(1);
}


// To update wikidata
// add your oauth credentials into `./secrets.json`
let _wbEdit: WikibaseEditAPI | undefined;
if (_secrets && _secrets.wikibase) {
  _wbEdit = wikibaseEdit({
    instance: 'https://www.wikidata.org',
    credentials: _secrets.wikibase,
    summary: 'Updated name-suggestion-index related claims, see https://nsi.guide for project details.',
    userAgent: `${packageJSON.name}/${packageJSON.version} (${packageJSON.homepage})`,
  });
}


// what to fetch
const START = '🏗   ' + styleText('yellow', `Loading index files…`);
const END = '👍  ' + styleText('green', `done loading`);
console.log(START);
console.time(END);

const _nsi = {} as NsiCache;
await fileTree.read(_nsi, _loco);
fileTree.expandTemplates(_nsi, _loco);
console.timeEnd(END);


// Gather all QIDs referenced by any tag..
console.log('');
console.log('🏗   ' + styleText('yellow', `Syncing Wikidata with name-suggestion-index…`));
console.log('       This is done in batches, and may take around 10 minutes…');
const _wikidata: Record<ItemId, WikidataProps> = {};
const _qidItems: Record<ItemId, Set<string>> = {};       // any item referenced by a qid
const _qidIdItems: Record<ItemId, Set<string>> = {};     // items where we actually want to update the NSI-identifier on wikidata
const _qidMetadata: Record<ItemId, QidMetadata> = {};

for (const tkv of Object.keys(_nsi.path)) {
  const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
  const t = parts[0];

  const items = _nsi.path[tkv].items;
  if (!Array.isArray(items) || !items.length) continue;

  for (const item of items) {
    const tags = item.tags;
    for (const osmtag of ['brand', 'flag', 'operator', 'network', 'subject']) {
      const wdTag = `${osmtag}:wikidata`;
      const qid = tags[wdTag] as ItemId;
      if (!qid || !/^Q\d+$/.test(qid)) continue;

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
        _qidMetadata[qid] = { what: 'organization', p31: 'Q43229' };
      }

      const isMainTag = (wdTag === trees[t].mainTag);
      if (isMainTag) {
        if (!_qidIdItems[qid])  _qidIdItems[qid] = new Set();
        _qidIdItems[qid].add(item.id);
      }
    }
  }
}

const _qids = Object.keys(_wikidata) as ItemId[];
const _total = _qids.length;
if (!_total) {
  console.log('Nothing to fetch');
  process.exit();
}

// Chunk into multiple wikidata API requests..
const _urls = wbk.getManyEntities({
  ids: _qids,
  languages: ['en','mul'],
  props: ['info', 'labels', 'descriptions', 'claims', 'sitelinks'],
  format: 'json'
});

const _warnings: Warning[] = [];

await doFetch();
await Bun.sleep(5000);
await removeOldNsiClaims();
await finish();


/**
 * Fetches Wikidata API requests sequentially.
 * Retries on network errors up to MAX_RETRIES times per batch.
 * @returns Resolves when all batches have been fetched and processed.
 */
async function doFetch() {
  for (let index = 0; index < _urls.length; index++) {
    const currURL = _urls[index];
    console.log(styleText(['yellow','bold'], `\nBatch ${index+1}/${_urls.length}`));

    let retries = 0;
    while (true) {
      let response;
      try {
        response = await fetch(currURL, FETCH_OPTS);
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
      } catch (e) {
        retries++;
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(styleText(['green','bold'], `fetch error (attempt ${retries}/${MAX_RETRIES}):`));
        console.warn(styleText('white', msg));
        if (retries >= MAX_RETRIES) {
          console.error(styleText('red', `Giving up on batch ${index+1} after ${MAX_RETRIES} attempts.`));
          break;
        }
        console.warn(styleText(['green','bold'], 'retrying...'));
        await Bun.sleep(5000);
        continue;
      }

      // Parse and process — errors here are bugs, not transient network issues
      const result = await response.json();
      await processEntities(result);
      await Bun.sleep(500);
      break;
    }
  }
}


/**
 * Processes the fetched results from the Wikidata API,
 * then schedules followup API calls to the Facebook API,
 * then eventually resolves when all that work is done.
 * @param result - The parsed JSON response from the Wikidata API containing entities.
 * @returns Resolves when all entities have been processed and Facebook logos fetched.
 */
async function processEntities(result: WdApiResult): Promise<void> {
  const facebookQueue: FacebookQueueItem[] = [];
  const wbEditQueue: WbEditRequest[] = [];

  for (const qid of (Object.keys(result.entities) as ItemId[])) {
    const meta = _qidMetadata[qid];
    const target = _wikidata[qid];
    const entity = result.entities[qid];
    const labelEn = entity.labels && entity.labels.en && entity.labels.en.value;
    const labelMul =  entity.labels && entity.labels.mul && entity.labels.mul.value;
    let label = labelEn ? labelEn : labelMul;

    if (entity.redirects) {
      const warning = { qid: qid, msg: `Wikidata QID redirects to ${entity.redirects.to}` };
      console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
      _warnings.push(warning);
    }

    if (Object.prototype.hasOwnProperty.call(entity, 'missing')) {
      label = enLabelForQID(qid) || qid;
      const warning = { qid: qid, msg: `⚠️  Entity for "${label}" was deleted.` };
      console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
      _warnings.push(warning);
      continue;
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
        const warning = { qid: qid, msg: `Entity for "${label}" is missing an English label.` };
        console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
        _warnings.push(warning);
      }
    }

    // Get description...
    const description = entity.descriptions && entity.descriptions.en && entity.descriptions.en.value;
    if (description) {
      target.description = description;
    }

    // Process claims below here...
    if (!entity.claims) continue;
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

    // P12454 - location information URL
    const locationInfoWebsites = getClaimValues(entity, 'P12454', true);
    if (locationInfoWebsites) {
      target.locationInfoWebsites = locationInfoWebsites;
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
      const restriction = getFacebookRestriction(entity, facebookUser);
      facebookQueue.push({ qid: qid, username: facebookUser, restriction: restriction });    // queue logo fetch
    }

    // P2397 - YouTube ID
    const youtubeUser = getClaimValue(entity, 'P2397');
    if (youtubeUser) {
      target.identities.youtube = youtubeUser;
    }

    // P11245 - YouTube Handle
    const youtubeHandle = getClaimValue(entity, 'P11245');
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

    // P11892 - Threads username
    const threadsUser = getClaimValue(entity, 'P11892');
    if (threadsUser) {
      target.identities.threads = threadsUser;
    }

    // P576 - Dissolution date
    if (meta.what !== 'flag' && meta.what !== 'subject') {
      processDissolutions(qid, entity, target);
    }


    // If we are allowed to make edits to wikidata, continue beyond here
    if (!_wbEdit) continue;

    // If P31 "instance of" is missing, set it to a reasonable value.
    const instanceOf = getClaimValue(entity, 'P31');
    if (!instanceOf && meta.p31) {
      const msg = `Setting P31 "instance of" = ${meta.p31} "${meta.what}" for ${qid}`;
      wbEditQueue.push({ qid: qid, id: qid, property: 'P31', value: meta.p31, msg: msg });
    }

    // If we want this qid to have an P8253 property ..
    if (_qidIdItems[qid]) {
      syncNsiIdentifiers(qid, entity, wbEditQueue);
    }

  }  // foreach qid

  await Promise.all( facebookQueue.map(obj => fetchFacebookLogo(obj.qid, obj.username, obj.restriction)) );
  await processWbEditQueue(wbEditQueue);
}


/**
 * Inspects qualifiers on the Facebook ID claim (P2013) to determine
 * whether the profile has an access restriction or special account type.
 * @param entity - A Wikidata entity object.
 * @param facebookUser - The Facebook username/ID to match against claims.
 * @returns A Wikidata QID for the restriction type, or `undefined` if unrestricted.
 * @see https://github.com/osmlab/name-suggestion-index/issues/10233
 */
function getFacebookRestriction(entity: WdEntity, facebookUser: string): ItemId | undefined {
  for (const c of entity.claims['P2013']) {
    if (c.mainsnak.snaktype === 'value' && c.mainsnak.datavalue.value === facebookUser) {
      // get access status of selected value - #10233
      const accessQualifiers = (c.qualifiers && c.qualifiers.P6954) || [];
      for (const q of accessQualifiers) {
        if (q.snaktype !== 'value') continue;

        const value = q.datavalue.value.id;
        // Q113165094 - location restrictions, Q58370623 - private account, Q107459441 - only visible when logged in
        if (value === 'Q58370623' || value === 'Q107459441' || value === 'Q113165094') {
          return value;
        }
      }

      // get "does not have characteristic" status of selected value
      const charQualifiers = (c.qualifiers && c.qualifiers.P6477) || [];
      for (const q of charQualifiers) {
        if (q.snaktype !== 'value') continue;

        const value = q.datavalue.value.id;
        // Q101420143 - Facebook page, Q134432781 - professional account
        if (value === 'Q101420143' || value === 'Q134432781') {
          return value;
        }
      }

      return undefined;
    }
  }
  return undefined;
}


/**
 * Processes P576 (dissolution date) claims for an entity, building
 * `Dissolution` objects with optional country restrictions and successor QIDs.
 * Pushes warnings for entities that may have been replaced.
 * @param qid - The Wikidata QID of the entity.
 * @param entity - The raw Wikidata entity object.
 * @param target - The `WikidataTarget` to populate with dissolution data.
 */
function processDissolutions(qid: ItemId, entity: WdEntity, target: WikidataProps): void {
  const claims = (wbk.simplify.propertyClaims(entity.claims.P576, { keepQualifiers: true }) as CustomSimplifiedClaim[]);
  for (const item of claims) {
    if (!item.value) continue;

    const excluding = item.qualifiers?.P1011 ?? [];
    if (excluding.includes('Q168678')) continue;  // but skip if 'excluding' = 'brand name', see #9134
    if (excluding.includes('Q431289')) continue;  // but skip if 'excluding' = 'brand', see #8239

    const dissolution: Dissolution = { date: String(item.value) };

    if (item.qualifiers) {
      // P17 - Countries where the brand is dissoluted
      const countries = item.qualifiers.P17;
      if (countries) {
        dissolution.countries = countries.map(code => iso1A2Code(String(code))).filter((c): c is string => c !== null);
      }
      // look for potential successors: P156 - followed by; P1366 - replaced by (successor); P7888 - merged into (successor)
      const successorQID = (item.qualifiers.P156 || item.qualifiers.P1366 || item.qualifiers.P7888)?.[0];
      if (successorQID) {
        dissolution.upgrade = String(successorQID) as ItemId;
      }
    }

    if (!dissolution.upgrade) {
      // Sometimes the successor is stored as a claim and not as a direct reference of the dissolution date claim
      // Only set the value if there is nothing set yet, as the reference value of the claim might be more detailed
      // P156 - followed by; P1366 - replaced by (successor); P7888 - merged into (successor)
      const successor = getClaimValue(entity, 'P156') || getClaimValue(entity, 'P1366') || getClaimValue(entity, 'P7888');
      if (successor && successor.id) {
        dissolution.upgrade = successor.id;
      }
    }

    if (dissolution.upgrade) {
      const warning = { qid: qid, msg: `${target.label} might possibly be replaced by ${dissolution.upgrade}` };
      if (dissolution.countries) {
        warning.msg += `\nThis applies only to the following countries: ${JSON.stringify(dissolution.countries)}.`;
      }
      console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
      _warnings.push(warning);
    }
    target.dissolutions!.push(dissolution);
  }
}


/**
 * Synchronises P8253 (name-suggestion-index identifier) claims on Wikidata
 * with the locally known set of NSI IDs for a given QID.
 * Queues updates, additions, and removals as needed.
 * @param qid - The Wikidata QID to sync identifiers for.
 * @param entity - The raw Wikidata entity object.
 * @param wbEditQueue - The queue to push edit requests onto.
 */
function syncNsiIdentifiers(qid: ItemId, entity: WdEntity, wbEditQueue: WbEditRequest[]): void {
  // P8253 - name-suggestion-index identifier
  // sort ids so claim order is deterministic, to avoid unnecessary updating
  const nsiIds = Array.from(_qidIdItems[qid])
    .sort(withLocale);
  const nsiClaims = (wbk.simplify.propertyClaims(entity.claims.P8253, { keepAll: true, keepNonTruthy: true }) as CustomSimplifiedClaim[])
    .sort((a, b) => withLocale(String(a.value), String(b.value)));

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


/**
 * Gets a single claim value, considering claim rank.
 * - Disregards any claims with an end date qualifier in the past.
 * - Disregards any claims with "deprecated" rank.
 * - Accepts immediately any claim with "preferred" rank.
 * - Returns the latest claim with "normal" rank.
 * @param entity - A Wikidata entity object.
 * @param prop - The property ID to look up (e.g. 'P856').
 * @returns The claim value, or `undefined` if no matching claim is found.
 */
function getClaimValue(entity: WdEntity, prop: PropertyId): any {
  if (!entity.claims) return;
  if (!Array.isArray(entity.claims[prop])) return;

  let value: any;
  for (const c of entity.claims[prop]) {
    if (c.rank === 'deprecated') continue;
    if (c.mainsnak.snaktype !== 'value') continue;

    // skip if we find an end time qualifier - P582
    let ended = false;
    const qualifiers = (c.qualifiers && c.qualifiers.P582) || [];
    for (const q of qualifiers) {
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


/**
 * Gets all claim values for a property.
 * - Optionally disregards claims with an end date qualifier in the past.
 * - Optionally disregards claims with "deprecated" rank.
 * - Pushes claims with "preferred" rank to the front.
 * @param entity - A Wikidata entity object.
 * @param prop - The property ID to look up (e.g. 'P856').
 * @param includeDeprecated - Whether to include deprecated and ended claims.
 * @returns An array of claim values, or `undefined` if the property has no claims.
 */
function getClaimValues(entity: WdEntity, prop: PropertyId, includeDeprecated: boolean): any[] | undefined {
  if (!entity.claims) return;
  if (!Array.isArray(entity.claims[prop])) return;

  const values: any[] = [];
  for (const c of entity.claims[prop]) {
    if (c.rank === 'deprecated' && !includeDeprecated) continue;
    if (c.mainsnak.snaktype !== 'value') continue;

    // skip if we find an end time qualifier - P582
    let ended = false;
    const qualifiers = (c.qualifiers && c.qualifiers.P582) || [];
    for (const q of qualifiers) {
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


/**
 * Wraps up and writes output files:
 * - `dist/wikidata/warnings.json`
 * - `dist/wikidata/wikidata.json`
 * - `dist/wikidata/dissolved.json`
 * @returns Resolves when all files have been written.
 */
async function finish(): Promise<void> {
  const START = '🏗   ' + styleText('yellow', 'Writing output files');
  const END = '👍  ' + styleText('green', 'output files updated');
  console.log('');
  console.log(START);
  console.time(END);

  const dissolved: Record<string, Dissolution[]> = {};

  for (const qid of (Object.keys(_wikidata) as ItemId[])) {
    const target = _wikidata[qid];

    // sort the properties that we are keeping..
    for (const prop of (['identities', 'logos', 'dissolutions'] as const)) {
      if (target[prop] && Object.keys(target[prop]).length) {
        if ((target[prop] as object).constructor.name === 'Object') {
          (target as Record<string, any>)[prop] = sortObject(target[prop] as Record<string, any>);
        }
      } else {
        delete target[prop];
      }
    }

    if (target.dissolutions) {
      for (const itemID of _qidItems[qid]) {
        dissolved[itemID] = target.dissolutions!;
      }
    }

    // Don't `sortObject` the properties at this level, see #10259
    // _wikidata[qid] = sortObject(target);
  }

  _warnings.sort(sortWarnings);

  // Set `DRYRUN=true` at the beginning of this script to prevent actual file writes from happening.
  if (!DRYRUN) {
    await Promise.all([
      Bun.write('./dist/wikidata/warnings.json', stringify({ warnings: _warnings }) + '\n'),
      Bun.write('./dist/wikidata/wikidata.json', stringify({ wikidata: sortObject(_wikidata) }) + '\n'),
      Bun.write('./dist/wikidata/dissolved.json', stringify({ dissolved: sortObject(dissolved) }, { maxLength: 100 }) + '\n'),
    ]);
  }

  console.timeEnd(END);

  // `console.warn` whatever warnings we've gathered
  if (_warnings.length) {
    console.log(styleText(['yellow','bold'], `\nWarnings:`));
    for (const warning of _warnings) {
      console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
    }
  }
}


/**
 * Fetches a Facebook profile picture URL for the given username.
 * If the username ends with a numeric ID and the fetch fails, retries with just the ID.
 * @param qid - The Wikidata QID associated with this entity.
 * @param username - The Facebook username or page ID.
 * @param restriction - A Wikidata QID indicating an access restriction qualifier, or `undefined`.
 * @returns `true` on success, or `void` on failure.
 * @throws {Error} Re-throws if the Facebook API returns an error and no numeric fallback is available.
 * @see https://developers.facebook.com/docs/graph-api/reference/user/picture/
 */
async function fetchFacebookLogo(qid: ItemId, username: string, restriction: ItemId | undefined): Promise<true | void> {
  const target = _wikidata[qid];
  const logoURL = `https://graph.facebook.com/${username}/picture?type=large`;
  let userid;

  // Does this "username" end in a numeric id?  If so, fallback to it.
  const m = username.match(/-(\d+)$/);
  if (m) userid = m[1];

  try {
    // Can specify no redirect to fetch json and speed up this process
    const response = await fetch(`${logoURL}&redirect=0`);
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    const json = await response.json();

    if (!json) return true;

    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }

    // Default profile pictures aren't useful to the index - #2750
    if (json.data && !json.data.is_silhouette) {
      target.logos!.facebook = logoURL;
    }

    // queries of valid numeric IDs always return some data regardless of profile access status
    if ( restriction && restriction !== 'Q113165094' && (!username.match(/^\d+$/) || target.logos!.facebook) ) {
      // show warning if Wikidata notes that access to the profile is restricted in certain ways, but the profile is public - #10233
      // location restrictions (Q113165094) are skipped from this check because the API call will return different results
      // when run by users from different countries
      let warningText;
      if ( restriction === 'Q134432781' ) {
        warningText = `is marked as a personal account, but was successfully read as a public professional account`;
      } else {
        warningText = `has a restricted access qualifier, but is publicly accessible`;
      }
      const warning = { qid: qid, msg: `Facebook username @${username} ${warningText}` };
      console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
      _warnings.push(warning);
    }
    return true;

  } catch (e) {
    if (userid) {
      target.identities!.facebook = userid;
      return fetchFacebookLogo(qid, userid, restriction);   // retry with just the numeric id
    } else {
      // suppress warning if Wikidata notes that access to the profile is restricted in some way (#10233)
      // or if the profile is set up as a personal account
      if ( !restriction ) {
        const msg = e instanceof Error ? e.message : String(e);
        const warning = { qid: qid, msg: `Facebook username @${username}: ${msg}` };
        console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
        _warnings.push(warning);
      }
    }
  }
}


/**
 * Finds all items in Wikidata with NSI identifier claims (P8253)
 * and removes any old claims where the QID is no longer referenced.
 * @returns Resolves when all obsolete claims have been removed.
 */
async function removeOldNsiClaims(): Promise<void> {
  if (!_wbEdit) return;

  console.log('');
  console.log('🏗   ' + styleText('yellow', `Searching Wikidata for obsolete NSI identifier claims ...`));
  const query = `
    SELECT ?qid ?nsiId ?guid
    WHERE {
      ?qid    p:P8253  ?guid.
      ?guid  ps:P8253  ?nsiId.
    }`;

  try {
    const response = await fetch(wbk.sparqlQuery(query), FETCH_OPTS);
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    const json = await response.json();
    const results = wbk.simplify.sparqlResults(json);
    const wbEditQueue: WbEditRequest[] = [];
    for (const item of results) {
      if (!_qidIdItems[item.qid as ItemId]) {
        const msg = `Removing old NSI identifier for ${item.qid}: ${item.nsiId}`;
        wbEditQueue.push({ qid: item.qid as ItemId, guid: item.guid as string, msg: msg });
      }
    }
    await processWbEditQueue(wbEditQueue);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(styleText('red', msg));
  }
}


/**
 * Performs queued edits to Wikidata sequentially with a delay between each.
 * Set `DRYRUN=true` at the beginning of this script to prevent actual edits.
 * @param queue - The array of edit requests to process (mutated via `.pop()`).
 * @returns Resolves when all edits have been attempted.
 */
async function processWbEditQueue(queue: WbEditRequest[]): Promise<void> {
  if (!_wbEdit) return;

  while (queue.length) {
    const request = queue.pop()!;
    const qid = request.qid;
    const msg = request.msg;
    console.log(styleText('blue', `Updating Wikidata ${queue.length}:  ${msg}`));
    delete request.qid;
    delete request.msg;

    if (!DRYRUN) {
      try {
        let task;
        if (request.guid && request.snaks) {
          task = _wbEdit.reference.set(request as SetReferenceParams);  // update reference
        } else if (request.guid && request.newValue) {
          task = _wbEdit.claim.update(request as UpdateClaimParams);    // update claim
        } else if (request.guid && !request.newValue) {
          task = _wbEdit.claim.remove(request as RemoveClaimParams);    // remove claim
        } else if (!request.guid && request.id && request.property && request.value) {
          task = _wbEdit.claim.create(request as CreateClaimParams);    // create claim
        } else if (!request.guid && request.id && request.language && request.value) {
          task = _wbEdit.label.set(request as TermActionParams);        // set label
        }
        await task;
        await Bun.sleep(300);

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const warning: Warning = { qid: qid!, msg: errorMsg };
        console.warn(styleText('yellow', warning.qid.padEnd(12)) + styleText('red', warning.msg));
        _warnings.push(warning);
      }
    }
  }
}


/**
 * Picks a value suitable for use as an English label for the given QID.
 * Checks various tag keys (`name:en`, `brand:en`, etc.) and falls back to
 * Latin-script variants.
 * @param qid - The Wikidata QID to find a label for.
 * @returns An English label string, or `null` if none could be determined.
 */
function enLabelForQID(qid: ItemId): string | null {
  const meta = _qidMetadata[qid];

  for (const id of Array.from(_qidItems[qid])) {
    const item = _nsi.id.get(id);
    if (!item) continue;

    if (meta.what === 'flag') {
      if (looksLatin(item.tags.subject))  return `flag of ${item.tags.subject}`;

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

      for (const re of LATIN_TAG_PATTERNS) {
        const keylist = [];
        for (const key of Object.keys(item.tags)) {
          if (re.test(key)) keylist.push(key);
        }

        for (const key of keylist) {
          if (looksLatin(item.tags[key])) return item.tags[key];
        }
      }
    }
  }

  return null;

  function looksLatin(str: string | undefined): boolean {
    if (!str) return false;
    // nothing outside the latin unicode ranges
    return !/[^\u0020-\u024F\u1E02-\u1EF3]/.test(str);
  }
}



/**
 * Builds a URL query string from an object of key-value pairs.
 * Keys are sorted using locale-aware comparison.
 * @param obj - The key-value pairs to encode.
 * @returns A URL-encoded query string.
 */
function utilQsString(obj: Record<string, string | number>): string {
  return Object.keys(obj).sort(withLocale).map(key => {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }).join('&');
}


/**
 * Comparator for sorting warnings — sorts QIDs numerically, then by message.
 * @param a - First warning.
 * @param b - Second warning.
 * @returns A negative, zero, or positive number for sort ordering.
 */
function sortWarnings(a: Warning, b: Warning): number {
  const qid = /^Q(\d+)$/;
  const aMatch = a.qid.match(qid);
  const bMatch = b.qid.match(qid);
  if (aMatch && bMatch) {
    return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);   // sort QIDs numerically
  } else {
    return withLocale(a.msg, b.msg);
  }
}
