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

  const noise = [/ban(k|c)(a|o)?/gi, /банк/gi, /coop/gi, /express/gi, /(gas|fuel)/gi, /wireless/gi, /(shop|store)/gi];

  str = noise.reduce((acc, regex) => acc.replace(regex, ''), str);
  return simplify(str);
}
