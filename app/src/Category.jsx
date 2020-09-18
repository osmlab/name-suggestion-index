import React from "react";
import { Link } from "react-router-dom";

import CategoryInstructions from "./CategoryInstructions";
import CategoryRow from "./CategoryRow";
import Filters from "./Filters";


export default function Category(props) {
  const tree = props.tree;
  const data = props.data;
  const index = data.index;

  const id = props.id;
  const k = props.k;
  const v = props.v;
  const kv = `${k}/${v}`;
  const tkv = `${tree}/${k}/${v}`;
  const items = index.path && index.path[tkv];
  const hash = props.location.hash;
  const slug = hash && hash.slice(1);   // remove leading '#'

  let message;
  if (data.isLoading()) {
    message = "Loading, please wait...";
  } else if (!Array.isArray(items) || !items.length) {
    message = `No items for ${tkv}.`;
  }

  if (message) {
    return (
      <>
      <h2>{tkv}</h2>
      <Link to="index.html">↑ Back to overview</Link>
      <CategoryInstructions />
      <Filters data={data} />
      <div className="summary">
      {message}
      </div>
      </>
    );

  } else {    // re-rendering after data has finished loading..
    // If there was a slug in the URL, scroll to it.
    // Browser may have tried this already on initial render before data was there.
    // This component will render and return the rows, so scroll to the row after a delay.
    if (slug) {
      window.setTimeout(function() {
        const el = document.getElementById(slug);
        if (el) {
          el.scrollIntoView();
        }
      }, 50);
    }
  }

  // pick an icon for this category
  let icon_url = data.icons[kv];
  if (!icon_url) icon_url = data.icons[k];    // fallback to generic key=* icon
  if (!icon_url) icon_url = data.icons.shop;  // fallback to generic shop icon

  // filters
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase().trim();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase().trim();
  const inc = !!(data.filters && data.filters.inc);

  const rows = items.map(item => {
    // calculate slug
    item.slug = encodeURI(item.id);

    // apply selection if slug in URL matches slug
    item.selected = slug === item.slug;

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

    if (!item.filtered) {
      const tags = item.tags || {};
      const qid = tags['brand:wikidata'];
      const wd = data.wikidata[qid] || {};
      const logos = wd.logos || {};
      const hasLogo = Object.keys(logos).length;
      item.filtered = (inc && hasLogo);
    }

    return (
      <CategoryRow key={item.id} {...props} item={item} />
    );
  });

  return (
    <>
    <h2><img className="icon" src={icon_url} />{tkv}</h2>
    <Link to="index.html">↑ Back to overview</Link>
    <CategoryInstructions />
    <Filters data={data} />

    <table className="summary">
    <thead>
    <tr>
    <th>Name<br/>ID<br/>Locations</th>
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
