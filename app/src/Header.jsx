import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';


export default function Header(props) {
  return (
    <div id='header' className='hasCols'>
      { Title(props) }
      { TreeSwitcher(props) }
      { GitHub() }
    </div>
  );
};


function Title(props) {
  const data = props.data;
  const index = data.index;

  const t = props.t;
  const k = props.k;
  const v = props.v;

  // try to pick an icon
  let iconURL;
  if (!data.isLoading() && k && v) {
    let fallbackIcon;
    if (t === 'brands') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/shop-15.svg';
    } else if (t === 'operators') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@ideditor/temaki@4/icons/board_transit.svg';
    } else if (t === 'networks') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@ideditor/temaki@4/icons/shield.svg';
    }

    const kv = `${k}/${v}`;
    iconURL = data.icons[kv];
    if (!iconURL) iconURL = data.icons[k];    // fallback to generic key=* icon
    if (!iconURL) iconURL = fallbackIcon;     // fallback to generic icon
  }
  const icon = iconURL ? (<img className='icon' src={iconURL} />) : null;

  // pick a title
  let title;
  if (t && k && v) {
    title = `${t}/${k}/${v}`;
    document.title = `Name Suggestion Index - ${title}`;
  } else if (t) {
    title = `${t}/`;
    document.title = `Name Suggestion Index - ${title}`;
  } else {
    title = 'Name Suggestion Index';
    document.title = 'Name Suggestion Index';
  }

  return (
    <div id='title'>
    <h1>{icon}{title}</h1>
    </div>
  );
}


function TreeSwitcher(props) {
  const t = props.t;
  // const others = ['brands', 'operators', 'networks'].filter(d => d !== t);
  const others = [];
  const links = others.map(t => (<li><Link to={`index.html?t=${t}`}>{t}/</Link></li>));
  const list = links.length ? (<> see also: <ul>{links}</ul> </>) : null;

  return (
    <div id='treeswitcher'>
    {list}
    </div>
  );
}


function GitHub() {
  return (
    <div id='octocat'>
    <a href='https://github.com/osmlab/name-suggestion-index' target='_blank'>
      <FontAwesomeIcon icon={faGithub} size='2x' />
    </a>
    </div>
  );
}

