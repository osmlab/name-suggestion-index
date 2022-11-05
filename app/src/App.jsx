import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import Category from './Category';
import Header from './Header';
import Footer from './Footer';
import Overview from './Overview';

// Load the name-suggestion-index data files
const DIST = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist';
const INDEX = `${DIST}/nsi.min.json`;
const WIKIDATA = `${DIST}/wikidata.min.json`;

// We can use iD's taginfo file to pick icons
const TAGINFO = 'https://cdn.jsdelivr.net/npm/@openstreetmap/id-tagging-schema@3.5.1/dist/taginfo.min.json';


export default function App() {
  const [filters, setFilters] = useState({});
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);
  const [index, indexLoading] = useIndex(INDEX);
  const [icons, iconsLoading] = useTaginfo(TAGINFO);

  const appData = {
    isLoading: () => (wikidataLoading || indexLoading || iconsLoading),
    filters: filters,
    setFilters: setFilters,
    index: index,
    icons: icons,
    wikidata: wikidata.wikidata
  };

  return (
    <>
    <Switch>
      <Route path='/' render={render}/>
    </Switch>
    <Footer index={appData.index}/>
    </>
  );


  function render(routeProps) {
    const oldSearch = routeProps.location.search;
    const oldHash = routeProps.location.hash;
    let newSearch = oldSearch;
    let newHash = oldHash;
    let params = stringQs(oldSearch);

    if (!params.t) params.t = 'brands';

    // sync up the filtering params with the querystring params
    ['tt', 'cc', 'inc'].forEach(k => {
      if (appData.isLoading() && params[k]) {   // early render (user has not typed yet)
        filters[k] = params[k];                 // querystring overrides filters
      } else {
        if (filters[k]) {                       // after that
          params[k] = filters[k];               // filters overrides querystring
        } else {
          delete params[k];
        }
      }
    });

    // if passed an `id` param, lookup that item and override the `t`, `k`, `v` params
    if (!appData.isLoading() && params.id) {
      const item = appData.index.id[params.id];
      if (item) {
        const parts = item.tkv.split('/', 3);     // tkv = 'tree/key/value'
        params.t = parts[0];
        params.k = parts[1];
        params.v = parts[2];

        // move it from the `id` param to the hash
        newHash = '#' + params.id;
        delete params.id;
      }
    }

    // put params in this order
    let newParams = {};
    ['t', 'k', 'v', 'id', 'tt', 'cc', 'inc'].forEach(k => {
      if (params[k]) newParams[k] = params[k];
    });
    newSearch = '?' + qsString(newParams);

    // replace url state if it has changed
    if (newSearch !== oldSearch || newHash !== oldHash) {
      routeProps.location.search = newSearch;
      routeProps.location.hash = newHash;
      routeProps.history.replace(routeProps.location);
    }

    // finally render the page
    if ((params.k && params.v) || params.id) {
      return (
        <>
        <Header {...params} data={appData} />
        <div id='content'>
        <Category {...routeProps} {...params} data={appData} />
        </div>
        </>
      );
    } else {
      return (
        <>
        <Header {...params} data={appData} />
        <div id='content'>
        <Overview {...routeProps} {...params} data={appData} />
        </div>
        </>
      );
    }
  }


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


  // same as useFetch, but load index data into a cache
  function useIndex(url) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);

    async function fetchUrl() {
      const response = await fetch(url);
      const json = await response.json();
      let index = { path: {}, id: {}, meta: json._meta };

      // populate cache
      Object.keys(json.nsi).forEach(tkv => {
        const category = json.nsi[tkv];
        const items = category.items;
        if (!Array.isArray(items)) return;
        index.path[tkv] = items;
        items.forEach(item => {
          item.tkv = tkv;  // remember the path for later
          index.id[item.id] = item;
        });
      });

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
      tags.forEach(tag => {
        if (!tag.icon_url || !tag.key) return;
        let kv = tag.key;
        if (tag.value) {
          kv += '/' + tag.value;
        }
        icons[kv] = tag.icon_url;
      });

      setData(icons);
      setLoading(false);
    }

    useEffect(() => { fetchUrl(); }, []);
    return [data, loading];
  }


  function stringQs(str) {
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


  function qsString(obj) {
    return Object.keys(obj).map(key => {
      return encodeURIComponent(key) + '=' + (encodeURIComponent(obj[key]));
    }).join('&');
  }

};
