import { describe, it } from 'bun:test';
import { strict as assert } from 'bun:assert';
import { simplify } from '../src/nsi.ts';


describe('simplify', () => {

  it('lowercases', () => {
    assert.equal(simplify('Aldo'), 'aldo');
  });

  it('replaces diacritics', () => {
    assert.equal(simplify('André'), 'andre');
  });

  it('removes spaces', () => {
    assert.equal(simplify('Jimmy Choo'), 'jimmychoo');
  });

  it('removes various dashes', () => {
    assert.equal(simplify('PTV - Metropolitan'), 'ptvmetropolitan');  // hypen
    assert.equal(simplify('PTV – Metropolitan'), 'ptvmetropolitan');  // en dash (U+2013)
    assert.equal(simplify('PTV — Metropolitan'), 'ptvmetropolitan');  // em dash (U+2014)
    assert.equal(simplify('PTV ― Metropolitan'), 'ptvmetropolitan');  // horizontal bar (U+2015)
  });

  it('removes unprintable unicode (like RTL/LTR marks, zero width space, zero width nonjoiner)', () => {
    assert.equal(simplify('\u200FJim\u200Bmy\u200CChoo\u200E'), 'jimmychoo');
  });

  it('removes punctuation', () => {
    assert.equal(simplify('K+K Schuh-Center'), 'kkschuhcenter');
  });

  it('replaces & with and', () => {
    assert.equal(simplify('Johnston & Murphy'), 'johnstonandmurphy');
  });

  it('replaces ß (eszett) with ss', () => {
    assert.equal(simplify('Beßon'), 'besson');
  });

  it('replaces İ (0130) or i̇ (0069 0307) with i', () => {   // #5017, #8261 for examples
    assert.equal(simplify('İnşaat'), 'insaat');
    assert.equal(simplify('i̇nşaat'), 'insaat');
  });

  it('returns empty string if no input', () => {
    assert.equal(simplify(), '');
    assert.equal(simplify(null), '');
    assert.equal(simplify({}), '');
  });

});
