import { test } from 'tap';
import { stemmer } from '../index.mjs';

test('stemmer', t => {

  t.test('removes noise', t => {
    t.equal(stemmer('First National Bank'), 'firstnational');
    t.equal(stemmer('Shell Gas'), 'shell');
    t.equal(stemmer('Verizon Wireless'), 'verizon');
    t.end();
  });

  t.test('returns empty string if no input', t => {
    t.equal(stemmer(), '');
    t.equal(stemmer(null), '');
    t.equal(stemmer({}), '');
    t.end();
  });

  t.end();
});
