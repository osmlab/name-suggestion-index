const stemmer = require('../lib/stemmer.js');

describe('stemmer', () => {

  test('removes noise', () => {
    expect(stemmer('First National Bank')).toBe('firstnational');
    expect(stemmer('Shell Gas')).toBe('shell');
    expect(stemmer('Verizon Wireless')).toBe('verizon');
  });

  test('returns empty string if no input', () => {
    expect(stemmer()).toBe('');
    expect(stemmer(null)).toBe('');
  });

});
