const withLocale = new Intl.Collator('en-US').compare;  // specify 'en-US' for stable sorting


/**
 * Returns a shallow copy of an object with its keys sorted and any array values sorted.
 * Keys that look like Wikidata QIDs (e.g. `Q42`) are sorted numerically;
 * all other keys are sorted with en-US locale collation.
 * This is useful for producing deterministic JSON output for file diffing.
 *
 * @param   obj - The input object to sort
 * @returns A new object with sorted keys and sorted array values, or `null` if the input is falsy.
 */
export function sortObject<T extends object>(obj: T): T;
export function sortObject<T extends Record<string, unknown>>(obj: T): T | null {
  if (!obj) return null;

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort(keyCompare);
  for (const k of keys) {
    const v = obj[k];
    sorted[k] = Array.isArray(v) ? v.sort(withLocale) : v;
  }
  return sorted as T;


  /**
   * Compares two object keys, sorting Wikidata QIDs (`Q123`) numerically
   * and everything else with en-US locale collation.
   *
   * @param   a - First key
   * @param   b - Second key
   * @returns Negative if a < b, positive if a > b, zero if equal
   */
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
