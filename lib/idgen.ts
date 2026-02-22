import { simplify } from './simplify.ts';

interface Item {
  tags: Record<string, string>;
  displayName?: string;
}


// We want the identifiers to be useable in url strings and other places,
// and avoid any unicode or right-to-left surprises,
// so limit them to /^\w+$/  (only [A-Za-z0-9_] characters)
export function idgen(item: Item, tkv: string, locationID: string): string | null {
  let name;

  const parts = tkv.split('/', 3);   // tkv = "tree/key/value"
  const t = parts[0];

  // Run through the list of OSM keys looking for a suitable name
  let osmkeys;
  if (t === 'transit') {
    osmkeys = ['name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'int_name', 'name:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}', 'operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}'];
  } else if (t === 'operators') {
    osmkeys = ['operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'int_name', 'name:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}'];
  } else if (t === 'flags') {
    osmkeys = ['flag:name', 'subject'];
  } else {  // brands
    osmkeys = ['name', 'name:en', 'name:[a-z]+-Latn(-[a-z]+)?', 'int_name', 'name:[a-z]{2,3}', 'brand', 'brand:en', 'brand:[a-z]+-Latn(-[a-z]+)?', 'brand:[a-z]{2,3}', 'operator', 'operator:en', 'operator:[a-z]+-Latn(-[a-z]+)?', 'operator:[a-z]{2,3}', 'network', 'network:en', 'network:[a-z]+-Latn(-[a-z]+)?', 'network:[a-z]{2,3}'];
  }

  // First attempt, pick a name that matches /^\w+$/
  for (const osmkey of osmkeys) {
    let tryname;
    if (osmkey.includes('[a-z]')) {
      const keylist = [];
      const re = new RegExp(`^${osmkey}$`);
      for (const key of Object.keys(item.tags)) {
        if (re.test(key)) keylist.push(key);
      }

      for (const key of keylist) {
        tryname = simplify(item.tags[key]);
        if (/^\w+$/.test(tryname)) {
          name = tryname;
          break;
        }
      }

      if (name) break;

    } else {
      tryname = item.tags[osmkey];
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
    for (const osmkey of osmkeys) {
      if (osmkey.includes('[a-z]')) {
        const keylist = [];
        const re = new RegExp(`^${osmkey}$`);
        for (const key of Object.keys(item.tags)) {
          if (re.test(key)) keylist.push(key);
        }

        if (keylist.length > 0) {
          const message = simplify(item.tags[keylist[0]]);
          name = new Bun.CryptoHasher('md5').update(message).digest('hex').slice(0, 6);
        }

        if (name) break;

      } else {
        const tryname = item.tags[osmkey];
        if (!tryname) continue;

        const message = simplify(tryname);
        name = new Bun.CryptoHasher('md5').update(message).digest('hex').slice(0, 6);
        break;
      }
    }
  }

  if (name && tkv && locationID) {
    const message = `${tkv} ${locationID}`;
    const hash = new Bun.CryptoHasher('md5').update(message).digest('hex').slice(0, 6);
    return `${name}-${hash}`;
  } else {
    return null;
  }
}
