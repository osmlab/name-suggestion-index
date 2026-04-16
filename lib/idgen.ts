import { simplify } from './simplify.ts';
import type { NsiItem, NsiTree } from './types.ts';


/**
 * Generates a unique, URL-safe identifier for an NSI item.
 *
 * The id is built from a simplified name (derived from the item's tags) combined
 * with a short MD5 hash of the `tkv + locationID` pair.  Only `[A-Za-z0-9_]`
 * characters are allowed in the name portion so the id is safe for use in URLs.
 *
 * The function tries two passes over the item's tags (in a tree-dependent priority
 * order) to find a suitable name:
 *   1. Pick the first tag value whose simplified form matches `/^\w+$/`.
 *   2. If no clean name is found, fall back to a 6-character MD5 hex hash of
 *      the first available tag value.
 *
 * @param   item       - The item whose tags supply the name candidates
 * @param   tkv        - A `tree/key/value` path (e.g. `"brands/amenity/bank"`)
 * @param   locationID - A location identifier used to disambiguate items that
 *                       share the same name and tkv
 * @returns A string of the form `"name-hash"`, or `null` if no name could be derived from the tags.
 */
export function idgen(item: NsiItem, tkv: string, locationID: string): string | null {
  let name;

  const parts = tkv.split('/', 3);   // tkv = "tree/key/value"
  const t = parts[0] as NsiTree;

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
