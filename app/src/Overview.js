import React from "react";
import { Link } from "react-router-dom";

import OverviewInstructions from "./OverviewInstructions";


export default function Overview(props) {
  const tree = props.tree;
  const data = props.data;

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
      <div className="container">
      {message}
      </div>
      </>
    );
  }

  const items = [];
  Object.keys(data.dict).forEach(k => {
    let entry = data.dict[k];
    Object.keys(entry).forEach(v => {
      const kv = `${k}/${v}`;

      // pick an icon for this category
      let icon_url = data.icons[kv];
      if (!icon_url) {   // fallback to key only
        icon_url = data.icons[k];
      }
      if (!icon_url) {   // fallback to shop icon
        icon_url = data.icons.shop;
      }

      const keys = Object.keys(data.dict[k][v]);
      const count = keys.length;
      let complete = 0;

      keys.forEach(kvnd => {
          const entry = data.dict[k][v][kvnd];
          const tags = entry.tags || {};
          const qid = tags['brand:wikidata'];
          const wd = data.wikidata[qid] || {};
          const logos = wd.logos || {};
          if (Object.keys(logos).length) {
              complete++;
          }
      });

      items.push(
        <div key={kv} className="category">
        <img className="icon" src={icon_url} />
        <Link to={`index.html?k=${k}&v=${v}`}>{`${kv} (${complete}/${count})`}</Link>
        </div>
      );

    });
  });

  return (
    <>
    <h1>{tree}/</h1>
    <OverviewInstructions />
    <div className="container">
    {items}
    </div>
    </>
  );
};
