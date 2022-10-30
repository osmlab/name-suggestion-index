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

  let t = props.t;
  let k = props.k;
  let v = props.v;
  let tkv = `${t}/${k}/${v}`;
  let message;
  let items;

  if (data.isLoading()) {
    message = 'Loading, please wait...';

  } else {
    if (props.id) {   // if passed an `id` prop, that overrides the `t`, `k`, `v` props
      const item = index.id[props.id];
      if (item) {
        slug = encodeURI(item.id);
      } else {
        message = `No item found for "${props.id}".`;
      }
    }

    items = index.path && index.path[tkv];
    if (!message && !Array.isArray(items) || !items.length) {
      message = `No items found for "${tkv}".`;
    }
  }

  if (message) {
    return (
      <>
      <div className='nav'><Link to={`index.html?t=${t}`}>↑ Back to {t}/</Link></div>
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
  let wikidataTag;
  if (t === 'brands') {
    wikidataTag = 'brand:wikidata';
  } else if (t === 'flags') {
    wikidataTag = 'flag:wikidata';
  } else if (t === 'operators') {
    wikidataTag = 'operator:wikidata';
  } else if (t === 'transit') {
    wikidataTag = 'network:wikidata';
  }

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
        (code) => (typeof code !== 'string' || code.toLowerCase().indexOf(cc) === -1)
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

  if (t === 'flags') {
    return (
      <>
      <div className='nav'><Link to={`index.html?t=${t}`}>↑ Back to {t}/</Link></div>
      <CategoryInstructions t={t} />
      <Filters data={data} />

      <table className='summary'>
      <thead>
      <tr>
      <th>Name<br/>ID<br/>Locations</th>
      <th>OpenStreetMap Tags<hr/>NSI Hints</th>
      <th>Wikidata Name/Description<br/>Official Website</th>
      <th className='logo'>Commons Logo</th>
      </tr>
      </thead>

      <tbody>
      {rows}
      </tbody>

      </table>
      </>
    );
  } else {
    return (
      <>
      <div className='nav'><Link to={`index.html?t=${t}`}>↑ Back to {t}/</Link></div>
      <CategoryInstructions t={t} />
      <Filters data={data} />

      <table className='summary'>
      <thead>
      <tr>
      <th>Name<br/>ID<br/>Locations</th>
      <th>OpenStreetMap Tags<hr/>NSI Hints</th>
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
  }

};
