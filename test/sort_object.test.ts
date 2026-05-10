import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { sortObject } from '../lib/sort_object.ts';


describe('sortObject', () => {
  it('returns null for a falsy input', () => {
    assert.equal(sortObject(null as unknown as object), null);
  });

  it('sorts keys with locale collation', () => {
    const result = sortObject({ zebra: 1, apple: 2, mango: 3 });
    assert.deepEqual(Object.keys(result), ['apple', 'mango', 'zebra']);
  });

  it('sorts array values', () => {
    const result = sortObject({ tags: ['zebra', 'apple', 'mango'] });
    assert.deepEqual(result.tags, ['apple', 'mango', 'zebra']);
  });

  it('leaves non-array values unchanged', () => {
    const result = sortObject({ b: 'hello', a: 42 });
    assert.equal(result.a, 42);
    assert.equal(result.b, 'hello');
  });

  it('does not mutate the input object', () => {
    const input = { b: 1, a: 2 };
    sortObject(input);
    assert.deepEqual(Object.keys(input), ['b', 'a']);
  });

  it('sorts Wikidata QID keys numerically, not lexicographically', () => {
    const result = sortObject({ Q100: 'c', Q9: 'a', Q20: 'b' });
    assert.deepEqual(Object.keys(result), ['Q9', 'Q20', 'Q100']);
  });

  it('sorts mixed QID and non-QID keys using locale collation for non-QIDs', () => {
    // When only one of the two keys being compared is a QID, it falls back to locale compare.
    const result = sortObject({ Q10: 'a', beta: 'b', alpha: 'c' });
    assert.deepEqual(Object.keys(result), ['alpha', 'beta', 'Q10']);
  });
});
