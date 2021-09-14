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
    osmtags = ['name', 'name:en', 'network', 'network:en', 'operator', 'operator:en', 'brand', 'brand:en'];
  } else if (t === 'operators') {
    osmtags = ['name', 'name:en', 'operator', 'operator:en', 'brand', 'brand:en', 'network', 'network:en'];
  } else if (t === 'flags') {
    osmtags = ['flag:name', 'subject'];
  } else {  // brands
    osmtags = ['name', 'name:en', 'brand', 'brand:en', 'operator', 'operator:en', 'network', 'network:en'];
  }

  // First attempt, pick a name that matches /^\w+$/
  for (let i = 0; i < osmtags.length; i++) {
    let tryname = item.tags[osmtags[i]];
    if (!tryname) continue;

    tryname = simplify(tryname);
    if (/^\w+$/.test(tryname)) {
      name = tryname;
      break;
    }
  }

  // If that didn't work, try again but just create a short hash for it.
  if (!name) {
    for (let i = 0; i < osmtags.length; i++) {
      const tryname = item.tags[osmtags[i]];
      if (!tryname) continue;

      const message = simplify(tryname);
      name = crypto.createHash('md5').update(message).digest('hex').slice(0, 6);
      break;
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
