import React, { useState, useEffect } from "react";
import { Route, Switch } from "react-router-dom";

import Category from "./Category";
import Footer from "./Footer";
import Overview from "./Overview";

const DIST = "https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/dist"
const NAMES = `${DIST}/names_keep.json`;
const BRANDS = `${DIST}/brands.json`;
const WIKIDATA = `${DIST}/wikidata.json`;


export default () => {
  const tree = 'brands';
  const [names, namesLoading] = useFetch(NAMES);
  const [brands, brandsLoading] = useFetch(BRANDS);
  const [wikidata, wikidataLoading] = useFetch(WIKIDATA);

  const appData = {
    names: names,
    brands: brands,
    wikidata: wikidata
  };

  return (
    <>
    <Switch>
      <Route exact path="/:tree" render={ routeProps => <Overview {...routeProps} {...appData} /> } />
      <Route path="/:tree/:k/:v" render={ routeProps => <Category {...routeProps} {...appData} /> } />
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
};
