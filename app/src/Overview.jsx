import React from "react";
import { Link } from "react-router-dom";

import OverviewInstructions from "./OverviewInstructions";
import Filters from "./Filters";


export default function Overview(props) {
  const tree = props.tree;
  const data = props.data;
  const index = data.index;

  // filters
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase().trim();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase().trim();
  const inc = !!(data.filters && data.filters.inc);


  let message;
  if (data.isLoading()) {
    message = "Loading, please wait...";
  } else if (tree !== 'brands') {     // only one supported for now
    message = `No entries for ${tree}.`;
  }

  if (message) {
    return (
      <>
      <h1>{tree}/</h1>
      <OverviewInstructions />
      <Filters data={data} />
      <div className="container">
      {message}
      </div>
      </>
    );
  }

  const categories = [];
  Object.keys(index.path).forEach(tkv => {
    const parts = tkv.split('/', 3);
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];
    const kv = `${k}/${v}`;

    if (t !== tree) return;

    // pick an icon for this category
    let icon_url = data.icons[kv];
    if (!icon_url) icon_url = data.icons[k];    // fallback to generic key=* icon
    if (!icon_url) icon_url = data.icons.shop;  // fallback to generic shop icon

    const items = index.path[tkv];
    let count = 0;
    let complete = 0;

    items.forEach(item => {
      // apply filters
      if (tt) {
        const tags = Object.entries(item.tags);
        item.filtered = (tags.length && tags.every(
          (pair) => (pair[0].toLowerCase().indexOf(tt) === -1 && pair[1].toLowerCase().indexOf(tt) === -1)
        ));
      } else if (cc) {  // todo: fix countrycode filters - #4077
        const codes = (item.locationSet.include || []);
        item.filtered = (codes.length && codes.every(
          (code) => (code.toLowerCase().indexOf(cc) === -1)
        ));
      } else {
        delete item.filtered;
      }

      const tags = item.tags || {};
      const qid = tags['brand:wikidata'];
      const wd = data.wikidata[qid] || {};
      const logos = wd.logos || {};
      if (!item.filtered) {
        count++;
        if (Object.keys(logos).length) {
          complete++;
          if (inc) {
            item.filtered = true;
          }
        }
      }
    });

    const isComplete = (complete === count);
    const klass = "category" + ((!count || (inc && isComplete)) ? " hide" : "");
    categories.push(
      <div key={kv} className={klass} >
      <img className="icon" src={icon_url} />
      <Link to={`index.html?k=${k}&v=${v}`}>{`${kv} (${complete}/${count})`}</Link>
      </div>
    );
  });

  return (
    <>
    <h1>{tree}/</h1>
    <OverviewInstructions />
    <Filters data={data} />
    <div className="container">
    {categories}
    </div>
    </>
  );
};
