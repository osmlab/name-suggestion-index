import React from 'react';
import { Link } from 'react-router-dom';

import CategoryRowSocialLinks from './CategoryRowSocialLinks';


export default function CategoryRow(props) {
  const data = props.data;
  if (data.isLoading()) return;

  const item = props.item;
  const k = props.k;
  const v = props.v;

  // filters (used here for highlighting)
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase().trim();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase().trim();

  const rowClasses = [];
  if (item.filtered) rowClasses.push('hide');
  if (item.selected) rowClasses.push('selected');

  // choose something to use as the 'name'
  const n = item.tags.name || item.tags.brand || item.tags.operator || item.tags.network;

  const kvn = `${k}/${v}|${n}`;
  const count = data.names[kvn] || '< 50';
  const tags = item.tags || {};
  const qid = tags['brand:wikidata'];
  const bn = tags['brand'];
  const wd = data.wikidata[qid] || {};
  const label = wd.label || '';
  const description = wd.description ? '"' + wd.description + '"' : '';
  const identities = wd.identities || {};
  const logos = wd.logos || {};

  return (
    <tr className={rowClasses.join(' ') || null} >
    <td className='namesuggest'>
      <h3 className='slug' id={item.slug}>
        <a href={`#${item.slug}`}>#</a>
        <span className='anchor'>{item.displayName}</span>
      </h3>
      <div className='nsikey'><pre>{item.id}</pre></div>
      <div className='locations'>{ locoDisplay(item.locationSet, n) }</div>
      <div className='viewlink'>
        { searchOverpassLink(k, v, n, tags['brand:wikidata'], tags['brand']) }<br/>
        { searchGoogleLink(n) }<br/>
        { searchWikipediaLink(n) }
      </div>
    </td>
    <td className='count'>{count}</td>
    <td className='tags'><pre className='tags' dangerouslySetInnerHTML={ highlight(tt, displayTags(tags)) } /></td>
    <td className='wikidata'>
      <h3>{label}</h3>
      <span>{description}</span><br/>
      { wdLink(tags['brand:wikidata']) }
      { siteLink(identities.website) }
      <CategoryRowSocialLinks {...identities} />
    </td>
    <td className='logo'>{ logo(logos.wikidata) }</td>
    <td className='logo'>{ fblogo(identities.facebook, logos.facebook) }</td>
    <td className='logo'>{ logo(logos.twitter) }</td>
    </tr>
  );


  function locoDisplay(locationSet, name) {
    const val = JSON.stringify(locationSet);
    const q = encodeURIComponent(val);
    const href = `https://ideditor.github.io/location-conflation/?referrer=nsi&locationSet=${q}`;
    const title = `View LocationSet for ${name}`;
    return val && (
      <>
      <code dangerouslySetInnerHTML={ highlight(cc, val) } /><br/>
      <a target='_blank' href={href} title={title}>View LocationSet</a>
      </>
    );
  }


  function highlight(needle, haystack) {
    let html = haystack;
    if (needle) {
      const re = new RegExp('\(' + needle + '\)', 'gi');
      html = html.replace(re, '<mark>$1</mark>');
    }
    return  { __html: html };
  }


  function searchGoogleLink(name) {
    const q = encodeURIComponent(name);
    const href = `https://google.com/search?q=${q}`;
    const title = `Search Google for ${name}`;
    return (<a target='_blank' href={href} title={title}>Search Google</a>);
  }

  function searchWikipediaLink(name) {
    const q = encodeURIComponent(name);
    const href = `https://google.com/search?q=${q}+site%3Awikipedia.org`;
    const title = `Search Wikipedia for ${name}`;
    return (<a target='_blank' href={href} title={title}>Search Wikipedia</a>);
  }


  function searchOverpassLink(k, v, n, w, bn) {
    // Build Overpass Turbo link:
    const q = encodeURIComponent(`[out:json][timeout:100];
(nwr["name"="${n}"];);
out body;
>;
out skel qt;

{{style:
node[name=${n}],
way[name=${n}],
relation[name=${n}]
{ color:red; fill-color:red; }
node[${k}=${v}][name=${n}],
way[${k}=${v}][name=${n}],
relation[${k}=${v}][name=${n}]
{ color:yellow; fill-color:yellow; }
node[${k}=${v}][name=${n}][brand=${bn}][brand:wikidata=${w}],
way[${k}=${v}][name=${n}][brand=${bn}][brand:wikidata=${w}],
relation[${k}=${v}][name=${n}][brand=${bn}][brand:wikidata=${w}]
{ color:green; fill-color:green; }
}}`);

    // Create Overpass Turbo link:
    const href = `https://overpass-turbo.eu/?Q=${q}&R`;
    const title = `Search Overpass Turbo for ${n}`;
    return (<a target='_blank' href={href} title={title}>Search Overpass Turbo</a>);
  }

  function fblogo(username, src) {
    return (username && !src) ? <span>Profile restricted</span> : logo(src);
  }


  function logo(src) {
    return src && (
      <img className='logo' src={src}/>
    );
  }

  function wdLink(qid) {
    const href = `https://www.wikidata.org/wiki/${qid}`;
    return qid && (
      <div className='viewlink'>
      <a target='_blank' href={href}>{qid}</a>
      </div>
    );
  }


  function siteLink(href) {
    return href && (
      <div className='viewlink'>
      <a target='_blank' href={href}>{href}</a>
      </div>
    );
  }


  function displayTags(tags) {
    let result = '';
    Object.keys(tags).forEach(k => {
      result += `"${k}": "${tags[k]}"
`;
    });
    return result;
  }

};
