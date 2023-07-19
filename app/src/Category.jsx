import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { AppContext, getFilterParams, qsString } from './AppContext';
import { CategoryInstructions } from './CategoryInstructions';
import { CategoryRow } from './CategoryRow';


export function Category() {
  const context = useContext(AppContext);
  const index = context.index;
  const params = context.params;
  const hash = context.hash;
  let itemID = hash && hash.slice(1);   // remove leading '#'

  const t = params.t;
  const k = params.k;
  const v = params.v;
  const tkv = `${t}/${k}/${v}`;
  let message;
  let items;

  const filters = getFilterParams(params);
  const backparams = Object.assign({ t: t }, filters);

  if (context.isLoading()) {
    message = 'Loading, please wait...';

  } else {
    if (itemID) {   // if passed an `id` verify that it exists
      const item = index.id[itemID];
      if (!item) {
        message = `No item found for "${itemID}".`;
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
      <div className='nav'><Link to={'index.html?' + qsString(backparams)}>↑ Back to {t}/</Link></div>
      <CategoryInstructions/>
      <div className='summary'>
      {message}
      </div>
      </>
    );

  } else {    // if no message, we're re-rendering after data has finished loading..
    // If there was a itemID in the URL, scroll to it.
    // Browser may have tried this already on initial render before data was there.
    // This component will render and return the rows, so scroll to the row after a delay.
    if (itemID) {
      window.setTimeout(function() {
        const el = document.getElementById(itemID);
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


  const rows = items.map(item => {
    // class as selected if we have an itemID in the hash
    item.selected = (item.id === itemID);

    // apply filters
    if (filters.dis === 'true' && !context.dissolved[item.id]) {
      item.filtered = true;
    } else if (filters.tt) {
      const tags = Object.entries(item.tags) || [];
      item.filtered = (tags.length && tags.every(
        ([key, val]) => (!key.toLowerCase().includes(filters.tt) && !val.toLowerCase().includes(filters.tt))
      ));
    } else if (filters.cc) {  // todo: fix countrycode filters - #4077
      const codes = item.locationSet.include || [];
      item.filtered = (codes.length && codes.every(
        code => (typeof code !== 'string' || !code.toLowerCase().includes(filters.cc))
      ));
    } else {
      delete item.filtered;
    }

    if (!item.filtered) {
      const tags = item.tags || {};
      const qid = tags[wikidataTag];
      const wd = context.wikidata[qid] || {};
      const logos = wd.logos || {};
      const hasLogo = Object.keys(logos).length;
      item.filtered = (filters.inc && hasLogo);
    }

    return (
      <CategoryRow key={item.id} item={item} />
    );
  });


  let headerRow;
  if (t === 'flags') {  // Flags don't have social links / Facebook logo
    headerRow = (
      <tr>
      <th>Name<br/>ID<br/>Locations</th>
      <th>OpenStreetMap Tags<hr/>NSI Hints</th>
      <th>Wikidata Name/Description<br/>Official Website</th>
      <th className='logo'>Commons Logo</th>
      </tr>
    );
  } else {
    headerRow = (
      <tr>
      <th>Name<br/>ID<br/>Locations</th>
      <th>OpenStreetMap Tags<hr/>NSI Hints</th>
      <th>Wikidata Name/Description<br/>Official Website<br/>Social Links</th>
      <th className='logo'>Commons Logo</th>
      <th className='logo'>Facebook Logo</th>
    </tr>
    );
  }


  return (
    <>
    <div className='nav'><Link to={'index.html?' + qsString(backparams)}>↑ Back to {t}/</Link></div>
    <CategoryInstructions/>
    <table className='summary'>
    <thead>
    {headerRow}
    </thead>
    <tbody>
    {rows}
    </tbody>
    </table>
    </>
  );

};
