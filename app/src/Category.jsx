import React from 'react';
import { Link } from 'react-router-dom';

import CategoryInstructions from './CategoryInstructions';
import CategoryRow from './CategoryRow';
import Filters from './Filters';


export default function Category(props) {
  const data = props.data;
  const index = data.index;

  const hash = props.location.hash;
  let slug = hash && hash.slice(1);   // remove leading '#'

  let message;
  let items, t, k, v, tkv, kv;

  if (data.isLoading()) {
    message = 'Loading, please wait...';

  } else {
    if (props.id) {   // passed an `id` parameter
      const item = index.id[props.id];
      if (item) {
        const parts = item.tkv.split('/', 3);     // tkv = 'tree/key/value'
        t = parts[0];
        k = parts[1];
        v = parts[2];
        kv = `${k}/${v}`;
        tkv = `${t}/${k}/${v}`;
        slug = encodeURI(item.id);
      } else {
        kv = 'unknown';
        tkv = 'unknown';
        message = `No item found for "${props.id}".`;
      }

    } else {          // passed `t`, `k`, `v` parameters
      t = props.t;
      k = props.k;
      v = props.v;
      kv = `${k}/${v}`;
      tkv = `${t}/${k}/${v}`;
    }

    items = index.path && index.path[tkv];
    if (!message && !Array.isArray(items) || !items.length) {
      message = `No items found for "${tkv}".`;
    }
  }

  if (message) {
    return (
      <>
      <h2>{tkv}</h2>
      <Link to='index.html'>↑ Back to overview</Link>
      <CategoryInstructions t={t} />
      <Filters data={data} />
      <div className='summary'>
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

  // setup defaults for this tree..
  let fallbackIcon, wikidataTag;
  if (t === 'brands') {
    fallbackIcon = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/shop-15.svg';
    wikidataTag = 'brand:wikidata';
  } else if (t === 'operators') {
    fallbackIcon = 'https://cdn.jsdelivr.net/npm/@ideditor/temaki@4/icons/board_transit.svg';
    wikidataTag = 'operator:wikidata';
  } else if (t === 'networks') {
    fallbackIcon = 'https://cdn.jsdelivr.net/npm/@ideditor/temaki@4/icons/shield.svg';
    wikidataTag = 'network:wikidata';
  }

  // pick an icon for this category
  let icon_url = data.icons[kv];
  if (!icon_url) icon_url = data.icons[k];    // fallback to generic key=* icon
  if (!icon_url) icon_url = fallbackIcon;     // fallback to generic icon

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
      const qid = tags[wikidataTag];
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
    <h2><img className='icon' src={icon_url} />{tkv}</h2>
    <Link to='index.html'>↑ Back to overview</Link>
    <CategoryInstructions t={t} />
    <Filters data={data} />

    <table className='summary'>
    <thead>
    <tr>
    <th>Name<br/>ID<br/>Locations</th>
    <th>Count</th>
    <th>OpenStreetMap Tags</th>
    <th>Wikidata Name/Description<br/>Official Website<br/>Social Links</th>
    <th className='logo'>Commons Logo</th>
    <th className='logo'>Facebook Logo</th>
    <th className='logo'>Twitter Logo</th>
    </tr>
    </thead>

    <tbody>
    {rows}
    </tbody>

    </table>
    </>
  );
};
