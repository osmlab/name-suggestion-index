import { after, before, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { simplify } from '../index.mjs';

test('simplify', async t => {

  await t.test('lowercases', t => {
    assert.equal(simplify('Aldo'), 'aldo');
  });

  await t.test('replaces diacritics', t => {
    assert.equal(simplify('André'), 'andre');
  });

  await t.test('removes spaces', t => {
    assert.equal(simplify('Jimmy Choo'), 'jimmychoo');
  });

  await t.test('removes various dashes', t => {
    assert.equal(simplify('PTV - Metropolitan'), 'ptvmetropolitan');  // hypen
    assert.equal(simplify('PTV – Metropolitan'), 'ptvmetropolitan');  // en dash (U+2013)
    assert.equal(simplify('PTV — Metropolitan'), 'ptvmetropolitan');  // em dash (U+2014)
    assert.equal(simplify('PTV ― Metropolitan'), 'ptvmetropolitan');  // horizontal bar (U+2015)
  });

  await t.test('removes unprintable unicode (like RTL/LTR marks, zero width space, zero width nonjoiner)', t => {
    assert.equal(simplify('\u200FJim\u200Bmy\u200CChoo\u200E'), 'jimmychoo');
  });

  await t.test('removes punctuation', t => {
    assert.equal(simplify('K+K Schuh-Center'), 'kkschuhcenter');
  });

  await t.test('replaces & with and', t => {
    assert.equal(simplify('Johnston & Murphy'), 'johnstonandmurphy');
  });

  await t.test('replaces ß (eszett) with ss', t => {
    assert.equal(simplify('Beßon'), 'besson');
  });

  await t.test('replaces İ (0130) or i̇ (0069 0307) with i', t => {   // #5017, #8261 for examples
    assert.equal(simplify('İnşaat'), 'insaat');
    assert.equal(simplify('i̇nşaat'), 'insaat');
  });

  await t.test('returns empty string if no input', t => {
    assert.equal(simplify(), '');
    assert.equal(simplify(null), '');
    assert.equal(simplify({}), '');
  });

});
