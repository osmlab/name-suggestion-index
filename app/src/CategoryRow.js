import React from "react";
import { Link } from "react-router-dom";

import CategoryRowSocialLinks from "./CategoryRowSocialLinks";


export default function CategoryRow(props) {
  const data = props.data;
  if (data.isLoading()) {
    return;
  }

  const kvnd = props.kvnd;
  const entry = props.entry;
  const k = props.k;
  const v = props.v;

  // filters
  const tt = ((data.filters && data.filters.tt) || '').toLowerCase();
  const cc = ((data.filters && data.filters.cc) || '').toLowerCase();

  // if there was a hash, re-scroll to it..
  // (browser may have tried this already on initial render before data was there)
  const hash = props.location.hash;
  if (hash) {
    window.setTimeout(() => {
      window.location.hash = '';
      window.location.hash = hash;
    },10);
  }

  const slug = slugify(kvnd.split('|')[1]);
  const count = data.names[kvnd] || '< 50';
  const tags = entry.tags || {};
  const qid = tags['brand:wikidata'];
  const wd = data.wikidata[qid] || {};
  const label = wd.label || '';
  const description = wd.description ? '"' + wd.description + '"' : '';
  const identities = wd.identities || {};
  const logos = wd.logos || {};

  return (
    <tr>
    <td className="namesuggest">
      <h3 className="slug" id={slug}>
        <a href={`#${slug}`}>#</a>
        <span className="anchor">{tags.name}</span>
      </h3>
      <div className="nsikey"><pre>'{kvnd}'</pre></div>
      <div className="countries">{ countries(entry.countryCodes) }</div>
      <div className="viewlink">{ overpassLink(k, v, tags.name) }</div>
    </td>
    <td className="count">{count}</td>
    <td className="tags"><pre className="tags" dangerouslySetInnerHTML={ highlight(tt, displayTags(tags)) } /></td>
    <td className="wikidata">
      <h3>{label}</h3>
      <span>{description}</span><br/>
      { wdLink(tags['brand:wikidata']) }
      { siteLink(identities.website) }
      <CategoryRowSocialLinks {...identities} />
    </td>
    <td className="logo">{ logo(logos.wikidata) }</td>
    <td className="logo">{ fblogo(identities.facebook, logos.facebook) }</td>
    <td className="logo">{ logo(logos.twitter) }</td>
    </tr>
  );


  function countries(countryCodes) {
    const cclist = (countryCodes || []).join(', ');
    return cclist && (
      <>
      🌐
      <code dangerouslySetInnerHTML={ highlight(cc, cclist) } />
      </>
    );
  }


  function highlight(needle, haystack) {
    let html = haystack;
    if (needle) {
      let re = new RegExp('\(' + needle + '\)', 'gi');
      html = html.replace(re, '<mark>$1</mark>');

    }
    return  { __html: html };
  }


  function overpassLink(k, v, n) {
    const q = encodeURIComponent(`[out:json][timeout:60];
(nwr["${k}"="${v}"]["name"="${n}"];);
out body;
>;
out skel qt;`);
    const href = `https://overpass-turbo.eu/?Q=${q}&R`;
    return (
      <a target="_blank" href={href}>View on Overpass Turbo</a>
    );
  }

  function fblogo(username, src) {
    return (username && !src) ? <span>Profile restricted</span> : logo(src);
  }


  function logo(src) {
    return src && (
      <img className="logo" src={src}/>
    );
  }

  function wdLink(qid) {
    const href = 'https://www.wikidata.org/wiki/' + qid;
    return qid && (
      <div className="viewlink">
      <a target="_blank" href={href}>{qid}</a>
      </div>
    );
  }


  function siteLink(href) {
    return href && (
      <div className="viewlink">
      <a target="_blank" href={href}>{href}</a>
      </div>
    );
  }


  function displayTags(tags) {
    let result = '';
    Object.keys(tags).forEach(k => {
      result += `
"${k}": "${tags[k]}"`;
    });
    return result;
  }


  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

};
