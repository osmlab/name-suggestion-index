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
    <td className="tags"><pre className="tags">{ displayTags(tags) }</pre></td>
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
      <code>{cclist}</code>
      </>
    );
  }

  function overpassLink(k, v, n) {
    const q = encodeURIComponent(`[out:json][timeout:60];
(nwr["${k}"="${v}"]["name"="${n}"];);
out body;
>;
out skel qt;`);
    const href = `https://overpass-turbo.eu/?Q=${q}&R`;
    return (
      <Link target="_blank" to={href}>View on Overpass Turbo</Link>
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
      <Link target="_blank" to={href}>{qid}</Link>
      </div>
    );
  }

  function siteLink(href) {
    return href && (
      <div className="viewlink">
      <Link target="_blank" to={href}>{href}</Link>
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
