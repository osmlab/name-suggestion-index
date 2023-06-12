import { test } from 'tap';
import { simplify } from '../index.mjs';

test('simplify', t => {

  t.test('lowercases', t => {
    t.equal(simplify('Aldo'), 'aldo');
    t.end();
  });

  t.test('replaces diacritics', t => {
    t.equal(simplify('André'), 'andre');
    t.end();
  });

  t.test('removes spaces', t => {
    t.equal(simplify('Jimmy Choo'), 'jimmychoo');
    t.end();
  });

  t.test('removes various dashes', t => {
    t.equal(simplify('PTV - Metropolitan'), 'ptvmetropolitan');  // hypen
    t.equal(simplify('PTV – Metropolitan'), 'ptvmetropolitan');  // en dash (U+2013)
    t.equal(simplify('PTV — Metropolitan'), 'ptvmetropolitan');  // em dash (U+2014)
    t.equal(simplify('PTV ― Metropolitan'), 'ptvmetropolitan');  // horizontal bar (U+2015)
    t.end();
  });

  t.test('removes unprintable unicode (like RTL/LTR marks, zero width space, zero width nonjoiner)', t => {
    t.equal(simplify('\u200FJim\u200Bmy\u200CChoo\u200E'), 'jimmychoo');
    t.end();
  });

  t.test('removes punctuation', t => {
    t.equal(simplify('K+K Schuh-Center'), 'kkschuhcenter');
    t.end();
  });

  t.test('replaces & with and', t => {
    t.equal(simplify('Johnston & Murphy'), 'johnstonandmurphy');
    t.end();
  });

  t.test('replaces ß (eszett) with ss', t => {
    t.equal(simplify('Beßon'), 'besson');
    t.end();
  });

  t.test('replaces İ (0130) or i̇ (0069 0307) with i', t => {   // #5017, #8261 for examples
    t.equal(simplify('İnşaat'), 'insaat');
    t.equal(simplify('i̇nşaat'), 'insaat');
    t.end();
  });

  t.test('returns empty string if no input', t => {
    t.equal(simplify(), '');
    t.equal(simplify(null), '');
    t.equal(simplify({}), '');
    t.end();
  });

  t.end();
});
