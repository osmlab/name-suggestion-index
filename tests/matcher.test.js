const Matcher = require('../lib/matcher.js');
const data = require('./matcher.data.json');

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

let _matcher;

afterEach(() => {
  _matcher = null;
});

describe('buildMatchIndex', () => {
  test('does not throw', () => {
    expect(() => {
      _matcher = Matcher();
      _matcher.buildMatchIndex(data, loco);
    }).not.toThrow();
  });

  test('match throws if index not yet built', () => {
    expect(() => {
      _matcher = Matcher();
      const result = _matcher.match('amenity', 'fast_food', 'KFC');
    }).toThrow('not built');
  });
});


describe('buildLocationIndex', () => {
  test('does not throw', () => {
    expect(() => {
      _matcher = Matcher();
      _matcher.buildLocationIndex(data, loco);
    }).not.toThrow();
  });
});


describe('match', () => {
  beforeEach(() => {
    _matcher = Matcher();
    _matcher.buildMatchIndex(data, loco);
    _matcher.buildLocationIndex(data, loco);
  });

  // In practice, duplidate ids can't happen anymore.
  // We should find a better way to flag potential duplicates in the index.
  test('getWarnings', () => {
    const warnings  = _matcher.getWarnings();
    expect(warnings).toBeInstanceOf(Array);
    expect(warnings.length).toBe(0);
  });

  test('returns null if no match', () => {
    const result = _matcher.match('amenity', 'fast_food', 'Applebees');
    expect(result).toBeNull();
  });


  describe('basic matching, single result', () => {
    test('matches exact key/value/name', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Honey Baked Ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on official_name', () => {
      const result = _matcher.match('amenity', 'fast_food', 'The Honey Baked Ham Company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('fuzzy match name', () => {
      const result = _matcher.match('amenity', 'fast_food', 'HoNeyBaKed\thäm!');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on matchTags', () => {
      const result = _matcher.match('shop', 'deli', 'Honey Baked Ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on matchNames', () => {
      const result = _matcher.match('amenity', 'fast_food', 'honey baked ham company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on amenity/yes', () => {
      const result = _matcher.match('amenity', 'yes', 'honey baked ham company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on building/yes', () => {
      const result = _matcher.match('building', 'yes', 'honey baked ham company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });
  });


  describe('advanced matching, multiple result', () => {
    test('matches KFC in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', [-98.58, 39.828]);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('kfc-658eea');
    });

    test('does not match PFK in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', [-98.58, 39.828]);
      expect(result).toBeNull();
    });

    test('matches PFK in Quebec', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', [-71.208, 46.814]);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('pfk-a54c14');
    });

    test('matches KFC in Quebec', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', [-71.208, 46.814]);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
  // todo: introduce score?  sort PFK before KFC?
  // console.log(result);
    });

    test('matches KFC in Hong Kong', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', [114.19, 22.33]);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
  // todo: introduce score?  sort PFK before KFC?
  // console.log(result);
    });

  });

});
