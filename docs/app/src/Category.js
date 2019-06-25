import React from "react";
import { Link } from 'react-router-dom'

import CategoryInstructions from "./CategoryInstructions";
import CategoryRow from "./CategoryRow";


export default function Category(props) {
  const tree = props.match.params.tree;
  const k = props.match.params.k;
  const v = props.match.params.v;
  const data = props.data;

  if (data.isLoading()) {
    return (
      <>
      <h2>{tree}/{k}/{v}</h2>
      <Link to={"/" + tree}>↑ Back to top</Link>
      <CategoryInstructions />
      <div className="summary">
      Please wait...
      </div>
      </>
    );
  }

  const entries = data.dict[k][v];
  if (!entries) {
    return (
      <div>No entries for {k}/{v}.</div>
    );
  }

  const rows = Object.keys(entries).map(kvnd => {
    const entry = entries[kvnd];
    return (
      <CategoryRow key={kvnd} {...props} entry={entry} kvnd={kvnd} k={k} v={v} />
    );
  });

  return (
    <>
    <h2>{tree}/{k}/{v}</h2>
    <Link to={"/" + tree}>↑ Back to top</Link>
    <CategoryInstructions />

    <table className="summary">
    <thead>
    <tr>
    <th>Name<br/>ID<br/>Countries</th>
    <th>Count</th>
    <th>OpenStreetMap Tags</th>
    <th>Wikidata Name/Description<br/>Official Website<br/>Social Links</th>
    <th className="logo">Commons Logo</th>
    <th className="logo">Facebook Logo</th>
    <th className="logo">Twitter Logo</th>
    </tr>
    </thead>

    <tbody>
    {rows}
    </tbody>

    </table>
    </>
  );
};
