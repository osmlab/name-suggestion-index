import { simplify } from './simplify.ts';


/**
 * Removes common "noise" words from a name string and then simplifies the result.
 * Used to generate a stem for catching near-duplicate names
 * (e.g. "First National Bank" and "First National" would produce the same stem).
 *
 * Noise words removed: bank/banc/banco, банк, coop, express, gas/fuel, wireless, shop/store.
 *
 * @param   str - The input name string to stem
 * @returns A simplified, de-noised string. Returns an empty string if the input is not a string.
 */
export function stemmer(str?: string): string {
  if (typeof str !== 'string') return '';

  const noise = [
    /ban(k|c)(a|o)?/ig,
    /банк/ig,
    /coop/ig,
    /express/ig,
    /(gas|fuel)/ig,
    /wireless/ig,
    /(shop|store)/ig
  ];

  str = noise.reduce((acc, regex) => acc.replace(regex, ''), str);
  return simplify(str);
}
