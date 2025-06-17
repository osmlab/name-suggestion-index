// External
import crypto from 'node:crypto';

// Internal
import { simplify } from './simplify.js';


// We want the identifiers to be useable in url strings and other places,
// and avoid any unicode or right-to-left surprises,
// so limit them to /^\w+$/  (only [A-Za-z0-9_] characters)
export function idgen(item, tkv, locationID) {
  let name;

  const parts = tkv.split('/', 3);     // tkv = "tree/key/value"
  const t = parts[0];

  // run through the list of tags looking for a suitable name
  let osmtags;
  if (t === 'transit') {
    osmtags = ['name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'name:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}', 'operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}'];
  } else if (t === 'operators') {
    osmtags = ['operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'name:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}'];
  } else if (t === 'flags') {
    osmtags = ['flag:name', 'subject'];
  } else {  // brands
    osmtags = ['name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'name:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}', 'operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}'];
  }

  // First attempt, pick a name that matches /^\w+$/
  for (let i = 0; i < osmtags.length; i++) {
    let tryname;
    if ( osmtags[i].includes('[a-z]') ) {
      let keylist = [];
      const ex = new RegExp(`^${osmtags[i]}$`);
      Object.keys(item.tags).forEach(key => {
        if (ex.test(key)) keylist.push(key);
      });

      for ( let j = 0; j < keylist.length; j++ ) {
        tryname = simplify(item.tags[keylist[j]]);
        if (/^\w+$/.test(tryname)) {
          name = tryname;
          break;
        }
      }

      if (name) break;
    } else {
      tryname = item.tags[osmtags[i]];
      if (!tryname) continue;

      tryname = simplify(tryname);
      if (/^\w+$/.test(tryname)) {
        name = tryname;
        break;
      }
    }
  }

  // If that didn't work, try again but just create a short hash for it.
  if (!name) {
    for (let i = 0; i < osmtags.length; i++) {
      if ( osmtags[i].includes('+-Latn') ) {
        let keylist = [];
        const ex = new RegExp(`^${osmtags[i]}$`);
        Object.keys(item.tags).forEach(key => {
          if (ex.test(key)) keylist.push(key);
        });

        for ( let j = 0; j < keylist.length; j++ ) {
          const message = simplify(item.tags[keylist[j]]);
          name = crypto.createHash('md5').update(message).digest('hex').slice(0, 6);
          break;
        }

        if (name) break;
      } else {
        const tryname = item.tags[osmtags[i]];
        if (!tryname) continue;

        const message = simplify(tryname);
        name = crypto.createHash('md5').update(message).digest('hex').slice(0, 6);
        break;
      }
    }
  }

  if (name && tkv && locationID) {
    const message = `${tkv} ${locationID}`;
    const hash = crypto.createHash('md5').update(message).digest('hex').slice(0, 6);
    return `${name}-${hash}`;
  } else {
    return null;
  }
}
