import React from "react";
import { Link } from 'react-router-dom'

import OverviewInstructions from "./OverviewInstructions";


export default function Overview(props) {
  const tree = props.match.params.tree;
  const wikidata = props.wikidata.wikidata;
  const dict = props.dict;
  const items = [];

  Object.keys(dict).forEach(k => {
    let entry = dict[k];
    Object.keys(entry).forEach(v => {
      let kv = `${k}/${v}`;
      let keys = Object.keys(dict[k][v]);
      let complete = 0;
      let count = keys.length;

      keys.forEach(kvnd => {
          let entry = dict[k][v][kvnd];
          let tags = entry.tags || {};
          let qid = tags['brand:wikidata'];
          let wd = wikidata[qid] || {};
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
