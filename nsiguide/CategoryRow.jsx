import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUnlock, faLock } from '@fortawesome/free-solid-svg-icons'; // SSL local and Unlock icon.
import { AppContext, getFilterParams, stripDiacritics } from './AppContext';
import { CategoryRowSocialLinks} from './CategoryRowSocialLinks';
import { TREES } from './constants';


export function CategoryRow(props) {
  const item = props.item;
  const context = useContext(AppContext);
  if (context.isLoading()) return;

  const params = context.params;
  const t = params.t;
  const k = params.k;
  const v = params.v;
  const filters = getFilterParams(params);   // filters are used here for highlighting

  // Determine dissolution date (if any)
  const dissolvedInfo = context.dissolved[item.id];
  let dissolved;
  if (Array.isArray(dissolvedInfo)) {
    const first = dissolvedInfo[0]?.date;
    const dissolvedDate = first && new Date(Date.parse(first));
    if (dissolvedDate) {
      dissolved = (<div className='dissolved'>(Dissolved { dissolvedDate.getUTCFullYear() })</div>);
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
  } else if (t === '*') {
    n = Object.values(TREES)
      .map(tree => item.tags[tree.tag])
      .find(Boolean)
      ?.replaceAll('"','\\\"');
    tags = item.tags || {};
    qid = Object.values(TREES)
      .map(tree => item.tags[tree.wikidataTag])
      .find(Boolean);

    // for the green styling, every [*:]wikidata tag must be correct.
    // merge these tags into an overpass tag filter string.
    const filter = Object.keys(item.tags)
      .filter(key => key.endsWith(":wikidata"))
      .map(key => {
        const plainKey = key?.replace(":wikidata", "");
        return `['${plainKey}'='${item.tags[plainKey]}']['${key}'='${item.tags[key]}']`
      })
      .join('');

    overpassQuery = `[out:json][timeout:100];
(nwr["name"="${n}"];);
out center;

{{style:
node,
way,
relation
{ color:red; fill-color:red; }
node['${k}'='${v}'],
way['${k}'='${v}'],
relation['${k}'='${v}']
{ color:yellow; fill-color:yellow; }
node['${k}'='${v}']${filter},
way['${k}'='${v}']${filter},
relation['${k}'='${v}']${filter}
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

    /* Add an <hr/> line break only if additional information will be displayed. */
    if (item.matchNames || item.matchTags || item.note || item.preserveTags || item.issues || item.fromTemplate)
      result += '<hr/>';

    /* Are the items being drawn from a template? 'item.fromTemplate' is set to true in nsi.json if templated. */
    if (item.fromTemplate) {
      let url, linktext;

      /* Brands */
      if ((t=='brands') && (k=='advertising') && (v=='totem'))
        {url = '/index.html?t=brands&amp;k=amenity&amp;v=fuel'; linktext = '/brands/amenity/fuel.json';}

      if ((t=='brands') && (k=='amenity') && (v=='atm'))
        {url = '/index.html?t=brands&amp;k=amenity&amp;v=bank'; linktext = '/brands/amenity/bank.json';}

      if ((t=='brands') && (k=='man_made') && (v=='charge_point'))
        {url = '/index.html?t=brands&amp;k=amenity&amp;v=charging_station'; linktext = '/brands/amenity/charging_station.json';}

      if ((t=='brands') && (k=='shop') && (v=='car_repair'))
        {url = '/index.html?t=brands&amp;k=shop&amp;v=car'; linktext = '/brands/shop/car.json';}

      /* Operators */
      if ((t=='operators') && (k=='leisure') && (v=='nature_reserve'))
        {url = '/index.html?t=operators&amp;k=leisure&amp;v=park'; linktext = '/operators/leisure/park.json';}

      if ((t=='operators') && (k=='man_made') && (v=='charge_point'))
        {url = '/index.html?t=operators&amp;k=amenity&amp;v=charging_station'; linktext = '/operators/amenity/charging_station.json';}
      if ((t=='operators') && (k=='man_made') && ((v=='pumping_station') || (v=='reservoir_covered')))
        {url = '/index.html?t=operators&amp;k=office&amp;v=water_utility'; linktext = '/operators/office/water_utility.json';}
      if ((t=='operators') && (k=='man_made') && (v=='tower'))
        {url = '/index.html?t=operators&amp;k=man_made&amp;v=mast'; linktext = '/operators/man_made/mast.json';}
      if ((t=='operators') && (k=='man_made') && ((v=='water_tower') || (v=='water_works')))
        {url = '/index.html?t=operators&amp;k=office&amp;v=water_utility'; linktext = '/operators/office/water_utility.json';}

      if ((t=='operators') && (k=='pipeline') && (v=='substation'))
        {url = '/index.html?t=operators&amp;k=man_made&amp;v=pipeline'; linktext = 'operators/man_made/pipeline.json';}

      if ((t=='operators') && (k=='power') && ((v=='minor_line') || (v=='pole') || (v=='tower')))
        {url = '/index.html?t=operators&amp;k=power&amp;v=line'; linktext = '/operators/power/line.json';}
      if ((t=='operators') && (k=='power') && (v=='transformer'))
        {url = '/index.html?t=operators&amp;k=power&amp;v=substation'; linktext = '/operators/power/substation.json';}

      /* Transit */
      if ((t=='transit') && (k=='amenity') && (v=='ferry_terminal'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=ferry'; linktext = '/transit/route/ferry.json';}

      if ((t=='transit') && (k=='highway') && (v=='bus_stop'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=bus'; linktext = '/transit/route/bus.json';}

      if ((t=='transit') && (k=='public_transport') && (v=='station_light_rail'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=light_rail'; linktext = '/transit/route/light_rail.json';}
      if ((t=='transit') && (k=='public_transport') && (v=='station_subway'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=light_rail'; linktext = '/transit/route/subway.json';}

      if ((t=='transit') && (k=='railway') && (v=='station'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=train'; linktext = '/transit/route/train.json';}
      if ((t=='transit') && (k=='railway') && (v=='tram_stop'))
        {url = '/index.html?t=transit&amp;k=route&amp;v=tram'; linktext = '/transit/route/tram.json';}

      if ((v=='post_box') || (v=='catenary_mast')) {
        /* Post Boxes and catenary masts use multiple templates */
        let url2, linktext2, searchLabel, searchLabel2;
        if (v=='post_box'){
          url = '/index.html?t=brands&amp;k=amenity&amp;v=post_office';
          linktext = '/brands/amenity/post_office.json';
          searchLabel = 'brands';
          url2 = '/index.html?t=operators&amp;k=amenity&amp;v=post_office';
          linktext2 = '/operators/amenity/post_office.json';
          searchLabel2 = 'operators';
        }
        if (v=='catenary_mast') {
          url = '/index.html?t=operators&amp;k=route&amp;v=railway';
          linktext = '/operators/route/railway.json';
          searchLabel = 'railway';
          url2 = '/index.html?t=operators&amp;k=route&amp;v=tracks';
          linktext2 = '/operators/route/tracks.json';
          searchLabel2 = 'tracks';
        }

        result += '<strong>Master templates:</strong><br/>';
        result += '<a href="' + url + '">' + linktext + '</a><br/>';
        result += 'Search ' + searchLabel + ' template master for ';
        result += '<a href="' + url + '&amp;tt=' + item.displayName + '">' + item.displayName + '</a><br/>';
        result += '<a href="' + url2 + '">' + linktext2 + '</a><br/>';
        result += 'Search ' + searchLabel2 + ' template master for ';
        result += '<a href="' + url2 + '&amp;tt=' + item.displayName + '">' + item.displayName + '</a><br/>';
      } else {
        /* All the rest use a single template */
        result += '<strong>Master template:</strong><br/>';
        result += '<a href="' + url + '">' + linktext + '</a><br/>';
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
      result += '<strong>preserveTags</strong>:<br/>' + item.preserveTags + '<br/>';
    if (item.issues) {
      result += '<strong>Issues / PR\'s / Discussions</strong>:<br/>';
      item.issues.forEach(issue => {
        result += '<a href="https://github.com/osmlab/name-suggestion-index/issues/' + issue + '" title="View issue #' + issue + '">#';
        result += issue;
        result += '</a><br/>';
      });
    }

    return result;
  }
};
