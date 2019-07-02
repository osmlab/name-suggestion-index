import React, { useState, useEffect } from "react";
import { Route, Switch } from "react-router-dom";

import Category from "./Category";
import Footer from "./Footer";
import Overview from "./Overview";

// Load the name-suggestion-index data files
const DIST = "https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/dist";
const NAMES = `${DIST}/names_keep.json`;
const BRANDS = `${DIST}/brands.json`;
const WIKIDATA = `${DIST}/wikidata.json`;

// We can use iD's taginfo file to pick icons
const TAGINFO = "https://raw.githubusercontent.com/openstreetmap/iD/master/data/taginfo.json";


export default function App() {
  const [filters, setFilters] = useState({});
  const [names, namesLoading] = useFetch(NAMES);
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);
  const [dict, dictLoading] = useBrands(BRANDS);
  const [icons, iconsLoading] = useTaginfo(TAGINFO);

  const appData = {
    isLoading: () => (namesLoading || wikidataLoading || dictLoading || iconsLoading),
    filters: filters,
    setFilters: setFilters,
    names: names,
    dict: dict,
    icons: icons,
    wikidata: wikidata.wikidata
  };

  return (
    <>
    <Switch>
      <Route path="/" render={ routeProps => {
        const params = parseParams(routeProps.location.search);
        if (params.k && params.v) {
          return (
            <Category {...routeProps} {...params} tree='brands' data={appData} />
          );
        } else {
          return (
            <Overview {...routeProps} tree='brands' data={appData} />
          );
        }
      } }/>
    </Switch>
    <Footer />
    </>
  );


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


  // same as useFetch, but process brand data into a k-v dict
  function useBrands(url) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);

    async function fetchUrl() {
      const response = await fetch(url);
      const json = await response.json();
      let obj = json.brands;
      let dict = {};

      // populate K-V dictionary
      Object.keys(obj).forEach(kvnd => {
        let kvndparts = kvnd.split('|', 2);
        let kvparts = kvndparts[0].split('/', 2);
        let k = kvparts[0];
        let v = kvparts[1];

        dict[k] = dict[k] || {};
        dict[k][v] = dict[k][v] || {};
        dict[k][v][kvnd] = sort(obj[kvnd]);

        if (dict[k][v][kvnd].tags) {
          dict[k][v][kvnd].tags = sort(obj[kvnd].tags);
        }
      });

      setData(dict);
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
      let tags = json.tags;
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
      let parts = pair.split('=');
      if (parts.length === 2) {
          obj[parts[0]] = (null === parts[1]) ? '' : decodeURIComponent(parts[1]);
      }
      return obj;
    }, {});
  }

  function sort(obj) {
    let sorted = {};
    Object.keys(obj).sort().forEach(k => {
      sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
  }

};
