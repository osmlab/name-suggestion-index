import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';

import CategoryRowSocialLinks from './CategoryRowSocialLinks';

import { faUnlock } from '@fortawesome/free-solid-svg-icons'; // SSL Unlock icon.
import { faLock }   from '@fortawesome/free-solid-svg-icons'; // SSL lock icon.

export default function CategoryRow(props) {
  const data = props.data;
  if (data.isLoading()) return;

  const item = props.item;
  const t = props.t;
  const k = props.k;
  const v = props.v;

  // filters (used here for highlighting)
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase().trim();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase().trim();

  const rowClasses = [];
  if (item.filtered) rowClasses.push('hide');
  if (item.selected) rowClasses.push('selected');

  // setup defaults for this tree..
  let n, kvn, tags, qid, overpassQuery;

  if (t === 'brands') {
    n = item.tags.brand || item.tags.name;
    n = n.replaceAll('"','\\\"');
    kvn = `${k}/${v}|${n}`;
    tags = item.tags || {};
    qid = tags['brand:wikidata'];
    let bn = tags['brand'];
    overpassQuery = `[out:json][timeout:100];
(nwr["name"="${n}"];);
out center;

{{style:
node,
way,
relation
{ color:red; fill-color:red; }
node[${k}=${v}],
way[${k}=${v}],
relation[${k}=${v}]
{ color:yellow; fill-color:yellow; }
node[${k}=${v}][brand=${bn}][brand:wikidata=${qid}],
way[${k}=${v}][brand=${bn}][brand:wikidata=${qid}],
relation[${k}=${v}][brand=${bn}][brand:wikidata=${qid}]
{ color:green; fill-color:green; }
}}`;

  } else if (t === 'flags') {
    n = item.tags['flag:name'];
    n = n.replaceAll('"','\\\"');
    kvn = `${k}/${v}|${n}`;
    tags = item.tags || {};
    qid = tags['flag:wikidata'];
    overpassQuery = `[out:json][timeout:100];
(nwr["flag:name"="${n}"];);
out center;`;

  } else if (t === 'operators') {
    n = item.tags.operator;
    n = n.replaceAll('"','\\\"');
    kvn = `${k}/${v}|${n}`;
    tags = item.tags || {};
    qid = tags['operator:wikidata'];
    overpassQuery = `[out:json][timeout:100];
(nwr["operator"="${n}"];);
out center;

{{style:
node,
way,
relation
{ color:red; fill-color:red; }
node[${k}=${v}],
way[${k}=${v}],
relation[${k}=${v}]
{ color:yellow; fill-color:yellow; }
node[${k}=${v}][operator:wikidata=${qid}],
way[${k}=${v}][operator:wikidata=${qid}],
relation[${k}=${v}][operator:wikidata=${qid}]
{ color:green; fill-color:green; }
}}`;

  } else if (t === 'transit') {
    n = item.tags.network;
    if (n != null)
      n = n.replaceAll('"','\\\"');
    kvn = `${k}/${v}|${n}`;
    tags = item.tags || {};
    qid = tags['network:wikidata'];
    overpassQuery = `[out:json][timeout:100];
(nwr["network"="${n}"];);
out body;
>;
out skel qt;

{{style:
node,
way,
relation
{ color:red; fill-color:red; }
node[${k}=${v}],
way[${k}=${v}],
relation[${k}=${v}]
{ color:yellow; fill-color:yellow; }
node[${k}=${v}][network:wikidata=${qid}],
way[${k}=${v}][network:wikidata=${qid}],
relation[${k}=${v}][network:wikidata=${qid}]
{ color:green; fill-color:green; }
}}`;
  }

  const wd = data.wikidata[qid] || {};
  const label = wd.label || '';
  const description = wd.description ? '"' + wd.description + '"' : '';
  const identities = wd.identities || {};
  const logos = wd.logos || {};

  if (t === 'flags') {
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
          { searchOverpassLink(n, overpassQuery) }<br/>
          { searchGoogleLink(n) }<br/>
          <strong>Search:&nbsp;</strong>
          { searchWikipediaLink(n) }
          &nbsp;/&nbsp;
          { searchWikidataLink(n) }
        </div>
      </td>
      <td className='tags'><pre className='tags' dangerouslySetInnerHTML={ highlight(tt, displayTags(tags)) } /></td>
      <td className='wikidata'>
        <h3>{label}</h3>
        <span>{description}</span><br/>
        { wdLink(qid) }
        { siteLink(identities.website) }
      </td>
      <td className='logo'>{ logo(logos.wikidata) }</td>
      </tr>
    );
  } else {
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
          { searchOverpassLink(n, overpassQuery) }<br/>
          { searchGoogleLink(n) }<br/>
          <strong>Search:&nbsp;</strong>
          { searchWikipediaLink(n) }
          &nbsp;/&nbsp;
          { searchWikidataLink(n) }
        </div>
      </td>
      <td className='tags'><pre className='tags' dangerouslySetInnerHTML={ highlight(tt, displayTags(tags)) } /></td>
      <td className='wikidata'>
        <h3>{label}</h3>
        <span>{description}</span><br/>
        { wdLink(qid) }
        { siteLink(identities.website) }
        <CategoryRowSocialLinks {...identities} />
      </td>
      <td className='logo'>{ logo(logos.wikidata) }</td>
      <td className='logo'>{ fblogo(identities.facebook, logos.facebook) }</td>
      <td className='logo'>{ logo(logos.twitter) }</td>
      </tr>
    );
  }


  function locoDisplay(locationSet, name) {
    const val = JSON.stringify(locationSet);
    const q = encodeURIComponent(val);
    const href = `https://location-conflation.com/?referrer=nsi&locationSet=${q}`;
    const title = `View LocationSet for ${name}`;
    return val && (
      <a target='_blank' href={href} title={title}><code dangerouslySetInnerHTML={ highlight(cc, val) } /></a>
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
    return (<a target='_blank' href={href} title={title}>Wikipedia</a>);
  }

  function searchWikidataLink(name) {
    const q = encodeURIComponent(name);
    const href = `https://google.com/search?q=${q}+site%3Awikidata.org`;
    const title = `Search Wikidata for ${name}`;
    return (<a target='_blank' href={href} title={title}>Wikidata</a>);
  }

  function searchOverpassLink(name, overpassQuery) {
    const q = encodeURIComponent(overpassQuery);
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
    let FAicon,FAsecure,FAinsecure;
    FAsecure = <span title='ssl web site'><FontAwesomeIcon icon={faLock} size='lg' /></span>;
    FAinsecure = <span title='non-ssl web site'><FontAwesomeIcon icon={faUnlock} size='lg' /></span>;

    if (href)
      FAicon = (href.startsWith("https://")) ? FAsecure : FAinsecure;

    return href && (
      <div className='viewlink'>
      <a target='_blank' href={href}>{href}</a>
      {FAicon}
      </div>
    );
  }

  function displayTags(tags) {
    let result = '';
    Object.keys(tags).forEach(k => {
      result += `${k}=${tags[k]}
`;
    });

    if (item.matchNames || item.matchTags || item.note || item.preserveTags)
      result += '<hr/>';

    if (item.matchNames)
      result += '<strong>matchNames</strong>:<br/>' + item.matchNames + '<br/>';
    if (item.matchTags)
      result += '<strong>matchTags</strong>:<br/>' + item.matchTags + '<br/>';
    if (item.note)
      result += '<strong>Note</strong>:<br/>' + item.note + '<br/>';
    if (item.preserveTags)
      result += '<strong>preserveTags</strong>:<br/>' + item.preserveTags;

    return result;
  }
};
