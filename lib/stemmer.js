// Internal
import { simplify } from './simplify.js';

// Removes noise from the name so that we can compare
// similar names for catching duplicates.
export function stemmer(str) {
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
