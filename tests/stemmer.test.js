import { after, before, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stemmer } from '../index.mjs';

test('stemmer', async t => {

  await t.test('removes noise', t => {
    assert.equal(stemmer('First National Bank'), 'firstnational');
    assert.equal(stemmer('Shell Gas'), 'shell');
    assert.equal(stemmer('Verizon Wireless'), 'verizon');
  });

  await t.test('returns empty string if no input', t => {
    assert.equal(stemmer(), '');
    assert.equal(stemmer(null), '');
    assert.equal(stemmer({}), '');
  });

});
