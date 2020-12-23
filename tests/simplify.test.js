const simplify = require('../lib/simplify.js');

describe('simplify', () => {

  test('lowercases', () => {
    expect(simplify('Aldo')).toBe('aldo');
  });

  test('replaces diacritics', () => {
    expect(simplify('André')).toBe('andre');
  });

  test('removes spaces', () => {
    expect(simplify('Jimmy Choo')).toBe('jimmychoo');
  });

  test('removes unprintable unicode (like RTL/LTR marks, zero width space, zero width nonjoiner)', () => {
    expect(simplify('\u200FJim\u200Bmy\u200CChoo\u200E')).toBe('jimmychoo');
  });

  test('removes punctuation', () => {
    expect(simplify('K+K Schuh-Center')).toBe('kkschuhcenter');
  });

  test('replaces & with and', () => {
    expect(simplify('Johnston & Murphy')).toBe('johnstonandmurphy');
  });

  test('replaces ß (eszett) with ss', () => {
    expect(simplify('Beßon')).toBe('besson');
  });

});