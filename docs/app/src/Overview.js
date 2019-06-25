import React from "react";
import { Link } from 'react-router-dom'

import OverviewInstructions from "./OverviewInstructions";


export default function Overview(props) {
  const tree = props.match.params.tree;
  const data = props.data;

  if (data.isLoading()) {
    return (
      <>
      <h1>{tree}/</h1>
      <OverviewInstructions />
      <div className="container">
      Please wait...
      </div>
      </>
    );
  }

  const items = [];
  Object.keys(data.dict).forEach(k => {
    let entry = data.dict[k];
    Object.keys(entry).forEach(v => {
      let kv = `${k}/${v}`;
      let keys = Object.keys(data.dict[k][v]);
      let complete = 0;
      let count = keys.length;

      keys.forEach(kvnd => {
          let entry = data.dict[k][v][kvnd];
          let tags = entry.tags || {};
          let qid = tags['brand:wikidata'];
          let wd = data.wikidata[qid] || {};
          let logos = wd.logos || {};
          if (Object.keys(logos).length) {
              complete++;
          }
      });

      items.push(
        <div key={kv} className="child">
        <Link to={`${tree}/${kv}`}>{`${kv} (${complete}/${count})`}</Link>
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
