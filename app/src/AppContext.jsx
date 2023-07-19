import { createContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Category } from './Category';
import { Header } from './Header';
import { Filters } from './Filters'
import { Footer } from './Footer';
import { Overview } from './Overview';

// Load the name-suggestion-index data files
const DIST = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist';
const INDEX = `${DIST}/nsi.min.json`;
const WIKIDATA = `${DIST}/wikidata.min.json`;
const DISSOLVED = `${DIST}/dissolved.min.json`;

// We can use iD's taginfo file to pick icons
const TAGINFO = 'https://cdn.jsdelivr.net/npm/@openstreetmap/id-tagging-schema@latest/dist/taginfo.min.json';


export const AppContext = createContext(null);

export function AppContextProvider() {
  const [index, indexLoading] = useNsi(INDEX);
  const [icons, iconsLoading] = useTaginfo(TAGINFO);
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);
  const [dissolved, dissolvedLoading] = useFetch(DISSOLVED);
  const [params, setParams] = useState({});
  const [hash, setHash] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Lock in one navigation change so the useEffects don't back and forth between pages
  let _didChangeLocation = false;

  // Update params/hash when location changes
  // Do the update only if something has really changed (to avoid infinite looping)
  useEffect(() => {
    let newHash = location.hash;
    let newSearch = location.search;
    let newParams = stringQs(newSearch);

    // if passed an `id` param, lookup that item and override the `t`,`k`,`v` params
    let itemID = newParams.id;
    if (itemID) {
      if (indexLoading) return;   // wait for index to load, we'll come back to this.

      const item = index.id[itemID];
      if (item) {
        const parts = item.tkv.split('/', 3);     // tkv = 'tree/key/value'
        newParams.t = parts[0];
        newParams.k = parts[1];
        newParams.v = parts[2];

        // move it from the `id` param to the hash
        newHash = '#' + itemID;
        delete newParams.id;

        newSearch = qsString(newParams);
      }
    }

    // update hash from location.hash
    // update params from location.search
    const oldSearch = '?' + qsString(params);
    if (hash !== newHash || oldSearch !== newSearch) {
      _didChangeLocation = true;
      setHash(newHash);
      setParams(stringQs(newSearch));
    }

  }, [location, indexLoading]);


  // Update location when params/hash changes
  // Do the update only if something has really changed (to avoid infinite looping)
  useEffect(() => {
    if (indexLoading) return;  // come back to it later

    // Put params in this order
    const newParams = {};
    ['t', 'k', 'v', 'id', 'tt', 'cc', 'inc', 'dis'].forEach(k => {
      if (params[k]) {
        newParams[k] = params[k];
      } else if (k === 't') {       // if no tree specified,
        newParams[k] = 'brands';    // default to the 'brands' tree
      }
    });

    const newSearch = '?' + qsString(newParams);
    const newHash = hash;

    // Update url ONLY if something has changed (to avoid infinite looping)
    if (!_didChangeLocation && newSearch !== location.search || newHash !== location.hash) {
      const to = location.pathname + newSearch + newHash;
      navigate(to, { replace: true });
      _didChangeLocation = false;
    }
  }, [params, hash, indexLoading]);


  const appState = {
    index: index,
    icons: icons,
    dissolved: dissolved.dissolved,
    wikidata: wikidata.wikidata,
    isLoading: () => (indexLoading || iconsLoading || wikidataLoading || dissolvedLoading),
    params: params,
    setParams: setParams,
    hash: hash,
    setHash: setHash
  };

  return (
    <AppContext.Provider value={appState}>
      <Header/>
      <Filters/>
      <div id='content'>
        { (params.k && params.v) ? <Category/> : <Overview/> }
      </div>
      <Footer/>
    </AppContext.Provider>
  );
}



// Fetch some data
function useFetch(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchUrl() {
    const response = await fetch(url);
    const json = await response.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { fetchUrl(); }, []);
  return [data, loading];
}


// same as useFetch, but load name-suggestion-index data into a cache
function useNsi(url) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  async function fetchUrl() {
    const response = await fetch(url);
    const json = await response.json();
    let index = { path: {}, id: {}, meta: json._meta };

    // populate cache
    for (const [tkv, category] of Object.entries(json.nsi)) {
      const items = category.items;
      if (!Array.isArray(items)) continue;  // empty category, skip

      index.path[tkv] = items;
      for (const item of items) {
        item.tkv = tkv;  // remember the path for later
        index.id[item.id] = item;
      }
    }

    setData(index);
    setLoading(false);
  }

  useEffect(() => { fetchUrl(); }, []);
  return [data, loading];
}


// same as useFetch, but process taginfo file to retrieve icon urls
function useTaginfo(url) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  async function fetchUrl() {
    const response = await fetch(url);
    const json = await response.json();
    const tags = json.tags;
    let icons = {};

    // populate icons
    for (const tag of tags) {
      if (!tag.icon_url || !tag.key) continue;

      let kv = tag.key;
      if (tag.value) {
        kv += '/' + tag.value;
      }
      icons[kv] = tag.icon_url;
    }

    setData(icons);
    setLoading(false);
  }

  useEffect(() => { fetchUrl(); }, []);
  return [data, loading];
}


// convert a query string to an object of `k=v` pairs
export function stringQs(str) {
  let i = 0;  // advance past any leading '?' or '#' characters
  while (i < str.length && (str[i] === '?' || str[i] === '#')) i++;
  str = str.slice(i);

  return str.split('&').reduce((obj, pair) => {
    const parts = pair.split('=');
    if (parts.length === 2) {
      obj[parts[0]] = (null === parts[1]) ? '' : decodeURIComponent(parts[1]);
    }
    return obj;
  }, {});
}


// convert an object of `k=v` pairs to a querystring
export function qsString(obj) {
  return Object.keys(obj).map(key => {
    return encodeURIComponent(key) + '=' + (encodeURIComponent(obj[key]));
  }).join('&');
}


// Gets the filtering params from the url params and cleans them up
export function getFilterParams(params) {
  const tt = (params.tt || '').toLowerCase().trim();
  const cc = (params.cc || '').toLowerCase().trim();
  const inc = (params.inc || '').toLowerCase().trim() === 'true';
  const dis = (params.dis || '').toLowerCase().trim() === 'true';

  const result = {};
  if (tt) result.tt = tt;
  if (cc) result.cc = cc;
  if (inc) result.inc = 'true';
  if (dis) result.dis = 'true';
  return result;
}


// Determines if the given item is filtered by the given filtering rules.
// true if the item is filtered (hidden), false if not filtered (visible)
export function isItemFiltered(context, filters, item) {
  const params = context.params;
  const t = params.t;

  // check 'dissolved'
  if (filters.dis === 'true' && !context.dissolved[item.id]) {
    return true;
  }

  // check 'text'
  if (filters.tt) {
    let match = false;

    // check tag keys, values, and matchNames
    const toCheck = new Set();
    for (const [key, val] of Object.entries(item.tags)) {
      toCheck.add(key.toLowerCase());
      toCheck.add(val.toLowerCase());
    }
    for (const name of (item.matchNames || [])) {
      toCheck.add(name.toLowerCase());
    }

    for (const str of toCheck) {
      if (str.includes(filters.tt)) {
        match = true;
        break;
      }
    }
    if (!match) return true;
  }

  // check 'country code'
  if (filters.cc) {
    let match = false;

    // check locationset include
    // todo: improve countrycode filters - #4077
    const toCheck = new Set();
    for (const code of (item.locationSet.include || [])) {
      if (typeof code !== 'string') continue;
      toCheck.add(code.toLowerCase());
    }
    for (const str of toCheck) {
      if (str.includes(filters.cc)) {
        match = true;
        break;
      }
    }
    if (!match) return true;
  }

  // check 'incomplete'
  // if we have wikidata tag and at least one logo, it's "complete"
  if (filters.inc === 'true') {
    let wikidataTag;
    if (t === 'brands') {
      wikidataTag = 'brand:wikidata';
    } else if (t === 'flags') {
      wikidataTag = 'flag:wikidata';
    } else if (t === 'operators') {
      wikidataTag = 'operator:wikidata';
    } else if (t === 'transit') {
      wikidataTag = 'network:wikidata';
    }

    const tags = item.tags || {};
    const qid = tags[wikidataTag];
    const wd = context.wikidata[qid] || {};
    const logos = wd.logos || {};

    if (Object.keys(logos).length) return true;
  }

  return false;
}
