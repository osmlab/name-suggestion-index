import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUnlock } from '@fortawesome/free-solid-svg-icons'; // SSL Unlock icon.
import { faLock }   from '@fortawesome/free-solid-svg-icons'; // SSL lock icon.

import { AppContext, getFilterParams, stripDiacritics } from './AppContext';
import { CategoryRowSocialLinks} from './CategoryRowSocialLinks';


export function CategoryRow(props) {
  const item = props.item;
  const context = useContext(AppContext);
  if (context.isLoading()) return;

  const params = context.params;
  const t = params.t;
  const k = params.k;
  const v = params.v;
  const filters = getFilterParams(params);   // filters are used here for highlighting

  // Determine dissolutation date (if any)
  const dissolvedInfo = context.dissolved[item.id];
  let dissolved;
  if (Array.isArray(dissolvedInfo)) {
    const first = dissolvedInfo[0]?.date;
    const dissolvedDate = first && new Date(Date.parse(first));
    if (dissolvedDate) {
      dissolved = (<div className='dissolved'>(Dissolved { dissolvedDate.getFullYear() })</div>);
    }
  }

  const rowClasses = [];
  if (item.filtered) rowClasses.push('hide');
  if (item.selected) rowClasses.push('selected');

  // setup defaults for this tree..
  let n, kvn, tags, qid, overpassQuery;

  if (t === 'brands') {
    n = item.tags.brand || item.tags.name;
    if (n != null) {
      n = n.replaceAll('"','\\\"');
    }
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
    if (n != null) {
      n = n.replaceAll('"','\\\"');
    }
    kvn = `${k}/${v}|${n}`;
    tags = item.tags || {};
    qid = tags['flag:wikidata'];
    overpassQuery = `[out:json][timeout:100];
(nwr["flag:name"="${n}"];);
out center;`;

  } else if (t === 'operators') {
    n = item.tags.operator;
    if (n != null) {
      n = n.replaceAll('"','\\\"');
    }
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
    if (n != null) {
      n = n.replaceAll('"','\\\"');
    }
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

  const wd = context.wikidata[qid] || {};
  const label = wd.label || '';
  const description = wd.description ? '"' + wd.description + '"' : '';
  const identities = wd.identities || {};
  const logos = wd.logos || {};

  if (t === 'flags') {    // Flags don't have social links / Facebook logo
    return (
      <tr className={rowClasses.join(' ') || null} >
      <td className='namesuggest'>
        <h3 className='slug' id={item.id}>
          <a href={`#${item.id}`}>#</a>
          <span className='anchor'>{item.displayName}</span>
        </h3>
        {dissolved}
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
      <td className='tags'><pre className='tags' dangerouslySetInnerHTML={ highlight(filters.tt, displayTags(tags)) } /></td>
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
        <h3 className='slug' id={item.id}>
          <a href={`#${item.id}`}>#</a>
          <span className='anchor'>{item.displayName}</span>
        </h3>
        {dissolved}
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
      <td className='tags'><pre className='tags' dangerouslySetInnerHTML={ highlight(filters.tt, displayTags(tags)) } /></td>
      <td className='wikidata'>
        <h3>{label}</h3>
        <span>{description}</span><br/>
        { wdLink(qid) }
        { siteLink(identities.website) }
        <CategoryRowSocialLinks {...identities} />
      </td>
      <td className='logo'>{ logo(logos.wikidata) }</td>
      <td className='logo'>{ fblogo(identities.facebook, logos.facebook) }</td>
      </tr>
    );
  }


  function locoDisplay(locationSet, name) {
    const val = JSON.stringify(locationSet);
    const q = encodeURIComponent(val);
    const href = `https://location-conflation.com/?referrer=nsi&locationSet=${q}`;
    const title = `View LocationSet for ${name}`;
    return val && (
      <a target='_blank' href={href} title={title}><code dangerouslySetInnerHTML={ highlight(filters.cc, val) } /></a>
    );
  }


  function highlight(needle, haystack) {
    let html = haystack;
    if (needle) {
      // needle = stripDiacritics(needle);
      needle = needle.replaceAll('+', '\\+'); // escape the + symbol.
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
    const href = `https://www.wikidata.org/?search=${q}`;
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
    let FAicon, FAsecure, FAinsecure;
    FAsecure = <span title='ssl web site'><FontAwesomeIcon icon={faLock} size='lg' /></span>;
    FAinsecure = <span title='non-ssl web site'><FontAwesomeIcon icon={faUnlock} size='lg' /></span>;

    if (href) {
      FAicon = (href.startsWith("https://")) ? FAsecure : FAinsecure;
    }

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

    /* Add an <hr/> line break only if addational information will be displayed. */
    if (item.matchNames || item.matchTags || item.note || item.preserveTags || item.fromTemplate)
      result += '<hr/>';

    /* Are the items being drawn from a template? 'item.fromTemplate' is set to true in nsi.json if templated. */
    if (item.fromTemplate) {
      let url, text;

      url = `/index.html?t=${t}&amp;k=${k}&amp;v=${v}`;
      text = `/${t}/${k}/${v}.json`;

      if (v=='post_box') {
        /* Post Boxes use multiple templates */
        result += '<strong>Master templates:</strong><br/>';
        result += '<a href="/index.html?t=brands&amp;k=amenity&amp;v=post_office">/brands/amenity/post_office.json</a><br/>';
        result += 'Search brands template master for <a href="/index.html?t=brands&amp;k=amenity&amp;v=post_office&amp;tt=' + item.displayName + '">' + item.displayName + '</a><br/>';
        result += '<a href="/index.html?t=operators&amp;k=amenity&amp;v=post_office">/operators/amenity/post_office.json</a><br/>';
        result += 'Search operators template master for <a href="/index.html?t=operators&amp;k=amenity&amp;v=post_office&amp;tt=' + item.displayName + '">' + item.displayName + '</a><br/>';
      } else {
        /* All the rest use a single template */
        result += '<strong>Master template:</strong><br/>';
        result += '<a href="' + url + '">' + text + '</a><br/>';
        result += 'Search template master for <a href="' + url + '&amp;tt=' + item.displayName + '">' + item.displayName + '</a><br/>';
      }
    }

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
