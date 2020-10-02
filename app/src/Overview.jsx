import React from 'react';
import { Link } from 'react-router-dom';

import OverviewInstructions from './OverviewInstructions';
import Filters from './Filters';


export default function Overview(props) {
  const t = props.t;
  const data = props.data;
  const index = data.index;

  // filters
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase().trim();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase().trim();
  const inc = !!(data.filters && data.filters.inc);


  // setup defaults for this tree..
  let fallbackIcon, wikidataTag;
  if (t === 'brands') {
    fallbackIcon = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/shop-15.svg';
    wikidataTag = 'brand:wikidata';
  } else if (t === 'transit') {
    fallbackIcon = 'https://cdn.jsdelivr.net/npm/@ideditor/temaki@4/icons/board_transit.svg';
    wikidataTag = 'network:wikidata';
  }

  // only render these components if we are loading a supported tree..
  const instructions = wikidataTag ? OverviewInstructions({t: t}) : null;
  const filters = wikidataTag ? Filters({data: data}) : null;

  let message;
  let paths;
  if (data.isLoading()) {
    message = 'Loading, please wait...';
  } else {
    paths = Object.keys(index.path).filter(tkv => tkv.split('/')[0] === t);
    if (!paths.length) {
      message = `No entries found for "${t}".`;
    }
  }

  if (message) {
    return (
      <>
      {instructions}
      {filters}
      <div className='container'>
      {message}
      </div>
      </>
    );
  }

  const categories = [];
  paths.forEach(tkv => {
    const parts = tkv.split('/', 3);
    const t = parts[0];
    const k = parts[1];
    const v = parts[2];
    const kv = `${k}/${v}`;

    // pick an icon for this category
    let icon_url = data.icons[kv];
    if (!icon_url) icon_url = data.icons[k];    // fallback to generic key=* icon
    if (!icon_url) icon_url = fallbackIcon;     // fallback to generic icon

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
      const qid = tags[wikidataTag];
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
    const klass = 'category' + ((!count || (inc && isComplete)) ? ' hide' : '');
    categories.push(
      <div key={tkv} className={klass} >
      <img className='icon' src={icon_url} />
      <Link to={`index.html?t=${t}&k=${k}&v=${v}`}>{`${kv} (${complete}/${count})`}</Link>
      </div>
    );
  });

  return (
    <>
    {instructions}
    {filters}
    <div className='container'>
    {categories}
    </div>
    </>
  );
};
