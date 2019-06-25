import React from "react";
import { Link } from 'react-router-dom'


export default function CategoryRow(props) {
  const data = props.data;
  if (data.isLoading()) {
    return;
  }

  const kvnd = props.kvnd;
  const entry = props.entry;
  const k = props.k;
  const v = props.v;

  const slug = slugify(kvnd);
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
        <Link to={`#${slug}`}>#</Link>
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
      { socialLinks(identities) }
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

  function socialLinks(identities) {
    let links = [];
    let href;

    if (identities.facebook) {
      href = 'https://www.facebook.com/' + identities.facebook;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-facebook-square"></i></a>`);
    }
    if (identities.twitter) {
      href = 'https://twitter.com/' + identities.twitter;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-twitter-square"></i></a>`);
    }
    if (identities.instagram) {
      href = 'https://www.instagram.com/' + identities.instagram;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-instagram"></i></a>`);
    }
    if (identities.pinterest) {
      href = 'https://www.pinterest.com/' + identities.pinterest;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-pinterest-square"></i></a>`);
    }
    if (identities.youtube) {
      href = 'https://www.youtube.com/channel/' + identities.youtube;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-youtube-square"></i></a>`);
    }
    if (identities.vk) {
      href = 'https://vk.com/' + identities.vk;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-vk"></i></a>`);
    }
    if (identities.snapchat) {
      href = 'https://www.snapchat.com/add/' + identities.snapchat;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-snapchat-square"></i></a>`);
    }
    if (identities.linkedin) {
      href = 'https://www.linkedin.com/company/' + identities.linkedin;
      links.push(`<a target="_blank" href="${href}"><i className="fab fa-lg fa-linkedin"></i></a>`);
    }

    return links.length ? '<div className="sociallinks">' + links.join('') + '</div>' : '';
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
