import { describe, it } from 'bun:test';
import { strict as assert } from 'bun:assert';
import { stemmer } from '../src/nsi.ts';


describe('stemmer', () => {

  it('removes noise', () => {
    assert.equal(stemmer('First National Bank'), 'firstnational');
    assert.equal(stemmer('Shell Gas'), 'shell');
    assert.equal(stemmer('Verizon Wireless'), 'verizon');
  });

  it('returns empty string if no input', () => {
    assert.equal(stemmer(), '');
    assert.equal(stemmer(null), '');
    assert.equal(stemmer({}), '');
  });

});
