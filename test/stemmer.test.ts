import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { stemmer } from '../src/nsi.ts';


describe('stemmer', () => {

  it('removes noise', () => {
    assert.equal(stemmer('First National Bank'), 'firstnational');
    assert.equal(stemmer('Shell Gas'), 'shell');
    assert.equal(stemmer('Verizon Wireless'), 'verizon');
  });

  it('returns empty string if no input', () => {
    assert.equal(stemmer(), '');
    // @ts-expect-error -- testing invalid input
    assert.equal(stemmer(null), '');
    // @ts-expect-error -- testing invalid input
    assert.equal(stemmer({}), '');
  });

});
