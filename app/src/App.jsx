import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import Category from './Category';
import Header from './Header';
import Footer from './Footer';
import Overview from './Overview';

// Load the name-suggestion-index data files
const DIST = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist';
const NAMES = `${DIST}/names_keep.json`;
const INDEX = `${DIST}/brands.json`;
const WIKIDATA = `${DIST}/wikidata.json`;

// We can use iD's taginfo file to pick icons
const TAGINFO = 'https://raw.githubusercontent.com/openstreetmap/iD/develop/data/taginfo.json';


export default function App() {
  const [filters, setFilters] = useState({});
  const [names, namesLoading] = useFetch(NAMES);
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);
  const [index, indexLoading] = useIndex(INDEX);
  const [icons, iconsLoading] = useTaginfo(TAGINFO);

  const appData = {
    isLoading: () => (namesLoading || wikidataLoading || indexLoading || iconsLoading),
    filters: filters,
    setFilters: setFilters,
    names: names,
    index: index,
    icons: icons,
    wikidata: wikidata.wikidata
  };

  return (
    <>
    <Switch>
      <Route path='/' render={render}/>
    </Switch>
    <Footer />
    </>
  );


  function render(routeProps) {
    let params = parseParams(routeProps.location.search);
    if (!params.t) params.t = 'brands';

    // if passed an `id` param, lookup that item and override the `t`, `k`, `v` params
    if (!appData.isLoading() && params.id) {
      const item = appData.index.id[params.id];
      if (item) {
        const parts = item.tkv.split('/', 3);     // tkv = 'tree/key/value'
        params.t = parts[0];
        params.k = parts[1];
        params.v = parts[2];
        routeProps.location.search = `?t=${params.t}&k=${params.k}&v=${params.v}`;
        routeProps.location.hash = `#${params.id}`;
        routeProps.history.replace(routeProps.location);
      }
    }

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
      let index = { path: {}, id: {} };

      // populate cache
      Object.keys(json).forEach(tkv => {
        const items = json[tkv];
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


  function parseParams(str) {
    if (str.charAt(0) === '?') {
      str = str.slice(1);
    }
    return str.split('&').reduce((obj, pair) => {
      const parts = pair.split('=');
      if (parts.length === 2) {
          obj[parts[0]] = (null === parts[1]) ? '' : decodeURIComponent(parts[1]);
      }
      return obj;
    }, {});
  }

};
