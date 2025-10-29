// External
import localeCompare from 'locale-compare';
const withLocale = localeCompare('en-US');

// Returns an object with sorted keys and sorted values.
// (This is useful for file diffing)
export function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj) return null;

  const sorted = {};
  const keys = Object.keys(obj).sort(keyCompare);
  for (const k of keys) {
    const v = obj[k];
    sorted[k] = Array.isArray(v) ? v.sort(withLocale) : v;
  }
  return sorted;


  function keyCompare(a: string, b: string): number {
    const qid = /^Q(\d+)$/;
    const aMatch = a.match(qid);
    const bMatch = b.match(qid);
    if (aMatch && bMatch) {
      return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);   // sort QIDs numerically
    } else {
      return withLocale(a, b);
    }
  }
}
