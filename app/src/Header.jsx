import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import { AppContext } from './AppContext';


export function Header() {

  return (
    <div id='header' className='hasCols'>
      { Title() }
      { TreeSwitcher() }
      { DarkMode() }
      { GitHub() }
    </div>
  );
};


function Title() {
  const context = useContext(AppContext);
  const params = context.params;
  const t = params.t;
  const k = params.k;
  const v = params.v;

  // try to pick an icon
  let iconURL;
  if (!context.isLoading() && k && v) {
    let fallbackIcon;
    if (t === 'brands') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/shop-15.svg';
    } else if (t === 'flags') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/embassy-15.svg';
    } else if (t === 'operators') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/briefcase.svg';
    } else if (t === 'transit') {
      fallbackIcon = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/board_transit.svg';
    }

    const kv = `${k}/${v}`;
    iconURL = context.icons[kv];
    if (!iconURL) iconURL = context.icons[k];   // fallback to generic key=* icon
    if (!iconURL) iconURL = fallbackIcon;       // fallback to generic icon

    // exceptions:
    if (kv === 'power/minor_line') {  // iD's power pole icon has a fill
      iconURL = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/power_pole.svg';
    } else if (kv === 'route/power') {
      iconURL = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/power_tower.svg';
    }
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
    <div id='title'><h1>{icon}{title}</h1></div>
  );
}


function TreeSwitcher() {
  const context = useContext(AppContext);
  const params = context.params;
  const t = params.t;
  const others = ['brands', 'flags', 'operators', 'transit'].filter(d => d !== t);
  const links = others.map(t => (<li key={t}><Link to={`index.html?t=${t}`}>{t}/</Link></li>));
  const list = links.length ? (<> see also: <ul>{links}</ul> </>) : null;

  return (
    <div id='treeswitcher'>{list}</div>
  );
}


function DarkMode() {
  let currValue = window.localStorage.getItem('nsi-darkmode');

  if (currValue === null) {  // initial, no preference set, use media query to check it
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currValue = 'true';
      window.localStorage.setItem('nsi-darkmode', currValue);
    }
  }

  setDarkMode(currValue);
  const checkedProp = (currValue === 'true') ? { defaultChecked: 'true' } : {};

  return (
    <div id='darkmode' className='control'>
      <FontAwesomeIcon icon={faSun} size='lg' />
      <label className='switch'>
        <input id='nsi-darkmode' type='checkbox' {...checkedProp} onChange={toggleDarkMode} />
        <span className='slider round'></span>
      </label>
      <FontAwesomeIcon icon={faMoon} size='lg' />
    </div>
  );

  function toggleDarkMode(e) {
    const newValue = (window.localStorage.getItem('nsi-darkmode') === 'true') ? 'false' : 'true';
    window.localStorage.setItem('nsi-darkmode', newValue);
    setDarkMode(newValue);
  }

  function setDarkMode(val) {
    if (val === 'true') {
      document.getElementById('root').classList.add('dark');
    } else {
      document.getElementById('root').classList.remove('dark');
    }
  }
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
