import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Category from './Category';
import Header from './Header';
import Footer from './Footer';
import Overview from './Overview';

// Load the name-suggestion-index data files
const DIST = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist';
const INDEX = `${DIST}/nsi.min.json`;
const WIKIDATA = `${DIST}/wikidata.min.json`;

// We can use iD's taginfo file to pick icons
const TAGINFO = 'https://cdn.jsdelivr.net/npm/@openstreetmap/id-tagging-schema@latest/dist/taginfo.min.json';


export default function App() {
  const [filters, setFilters] = useState({});
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);
  const [index, indexLoading] = useIndex(INDEX);
  const [icons, iconsLoading] = useTaginfo(TAGINFO);

  const appState = {
    isLoading: () => (wikidataLoading || indexLoading || iconsLoading),
    filters: filters,
    setFilters: setFilters,
    index: index,
    icons: icons,
    wikidata: wikidata.wikidata
  };

  // A hack so react-router will work with a local `file://` url
  // Determine what the "basename" needs to be.
  // If we're on a site like `https://nsi.guide`, it will just end up as '/'
  let pathArr = window.location.pathname.split('/');
  pathArr.pop();  // pop index.html
  const basename = pathArr.join('/') + '/';

  return (
    <>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="*" element={ <Main /> } />
      </Routes>
    </BrowserRouter>
    <Footer index={appState.index}/>
    </>
  );


  function Main() {
    const location = useLocation();
    const navigate = useNavigate();

    const oldSearch = location.search;
    const oldHash = location.hash;
    let newSearch = oldSearch;
    let newHash = oldHash;
    let params = stringQs(oldSearch);

    if (!params.t) params.t = 'brands';

    // sync up the filtering params with the querystring params
    ['tt', 'cc', 'inc'].forEach(k => {
      if (appState.isLoading() && params[k]) {   // early render (user has not typed yet)
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
    if (!appState.isLoading() && params.id) {
      const item = appState.index.id[params.id];
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
      location.search = newSearch;
      location.hash = newHash;
      navigate(location);
    }

    // finally render the page
    if ((params.k && params.v) || params.id) {
      return (
        <>
        <Header {...params} data={appState} />
        <div id='content'>
        <Category {...params} data={appState} />
        </div>
        </>
      );
    } else {
      return (
        <>
        <Header {...params} data={appState} />
        <div id='content'>
        <Overview {...params} data={appState} />
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
