import React from "react";
import { Route, Switch } from "react-router-dom";

import Category from "./Category";
import Footer from "./Footer";
import Overview from "./Overview";


export default () => {
  const tree = 'brands';
  return (
    <>
    <Switch>
      <Route exact path="/:tree" render={ props => <Overview {...props} /> } />
      <Route path="/:tree/:k/:v" render={ props => <Category {...props} /> } />
    </Switch>
    <Footer />
    </>
  );
};
