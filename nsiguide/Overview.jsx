import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { AppContext, isItemFiltered, getFilterParams, qsString } from './AppContext';
import { OverviewInstructions } from './OverviewInstructions';
import { TREES } from './constants';

export function Overview() {
  const context = useContext(AppContext);
  const index = context.index;
  const params = context.params;
  const filters = getFilterParams(params);
  const t = params.t;

  // setup defaults for this tree..
  const { fallbackIcon, wikidataTag } = TREES[t] || {
    fallbackIcon: 'https://cdn.jsdelivr.net/npm/@mapbox/maki@6/icons/marker-15.svg'
  };

  let message;
  let paths;
  if (context.isLoading()) {
    message = 'Loading, please wait...';
  } else {
    paths = Object.keys(index.path).filter(tkv => tkv.split('/')[0] === t || t === '*');
    if (!paths.length) {
      message = `No entries found for "${t}".`;
    }
  }

  // Display a message if the data isn't ready yet, or if this is not an actual tree.
  if (message) {
    return (
      <>
      <div className='container'>
      {message}
      </div>
      </>
    );
  }
//      { wikidataTag ? OverviewInstructions() : null }


  // For the counting code below, we'll apply the filtering rules but without 'inc',
  // so we can properly count complete vs incomplete.
  let f = Object.assign({}, filters);  // copy
  delete f.inc;

  /** @type {{ [kv: string]: string[] }} */
  const pathsByKV = {};
  for (const tkv of paths) {
    const [, k, v] = tkv.split('/', 3);
    const kv = `${k}/${v}`;
    pathsByKV[kv] ||= [];
    pathsByKV[kv].push(tkv);
  }

  // Display the categories under this tree.
  const categories = [];
  for (const kv of Object.keys(pathsByKV).sort()) {
    const [k, v] = kv.split('/', 2);

    // pick an icon for this category
    let iconURL = context.icons[kv];
    if (!iconURL) iconURL = context.icons[k];    // fallback to generic key=* icon
    if (!iconURL) iconURL = fallbackIcon;        // fallback to generic icon

    // exceptions:
    if (kv === 'power/minor_line') {  // iD's power pole icon has a fill
      iconURL = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/power_pole.svg';
    } else if (kv === 'route/power') {
      iconURL = 'https://cdn.jsdelivr.net/npm/@rapideditor/temaki@5/icons/power_tower.svg';
    }

    const items = pathsByKV[kv].flatMap(tkv => index.path[tkv])
    let count = 0;
    let complete = 0;

    for (const item of items) {
      const isFiltered = isItemFiltered(context, f, item);  // f = filters without 'inc'
      if (!isFiltered) {
        count++;
        const tags = item.tags || {};
        const qid = t === '*'
          ? Object.values(TREES).map(tree => tags[tree.wikidataTag]).find(Boolean)
          : tags[wikidataTag];
        const wd = context.wikidata[qid] || {};
        const logos = wd.logos || {};
        if (Object.keys(logos).length) {
          complete++;
        }
      }
    }

    const isComplete = (complete === count);
    const klass = 'category' + ((!count || (filters.inc && isComplete)) ? ' hide' : '');
    const linkparams = Object.assign({ t: t, k: k, v: v }, filters);

    categories.push(
      <div key={kv} className={klass} >
      <img className='icon' src={iconURL} />
      <Link to={'index.html?' + qsString(linkparams)}>{`${kv} (${complete}/${count})`}</Link>
      </div>
    );
  }

  return (
    <>
    <OverviewInstructions/>
    <div className='container'>
    {categories}
    </div>
    </>
  );
};
