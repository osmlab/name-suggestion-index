const Matcher = require('../lib/matcher.js');
const data = require('./matcher.data.json');

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation');
const loco = new LocationConflation(featureCollection);

let _matcher;

const USA = [-98.58, 39.828];
const QUEBEC = [-71.208, 46.814];
const HONGKONG = [114.19, 22.33];


describe('index building', () => {
  beforeEach(() => _matcher = Matcher() );
  afterEach(() => _matcher = null );

  test('buildMatchIndex does not throw', () => {
    expect(() => _matcher.buildMatchIndex(data)).not.toThrow();
  });

  test('buildLocationIndex does not throw', () => {
    expect(() => _matcher.buildLocationIndex(data, loco)).not.toThrow();
  });

  test('match throws if matchIndex not yet built', () => {
    expect(() => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC');
    }).toThrow('not built');
  });
});


describe('match', () => {
  beforeAll(() => {
    _matcher = Matcher();
    _matcher.buildMatchIndex(data);
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

    test('match on `official_name` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'The Honey Baked Ham Company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on local `name:*` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Honig Bebackener Schinken');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('match on `*:wikidata` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Q5893363');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('honeybakedham-4d2ff4');
    });

    test('does not match on `*:wikipedia` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'en:The Honey Baked Ham Company');
      expect(result).toBeNull();
    });

    test('does not match on `*:etymology` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Ignore Me');
      expect(result).toBeNull();
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
    test('matches KFC with unspecified location, results sort by area ascending', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe('pfk-a54c14');  // quebec area = 1821913 km²
      expect(result[1]).toBe('kfc-1ff19c');  // china area = 10386875 km²
      expect(result[2]).toBe('kfc-658eea');  // world area = 511207893 km²
    });

    test('matches KFC in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', USA);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('kfc-658eea');
    });
    test('does not match PFK in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', USA);
      expect(result).toBeNull();
    });
    test('does not match 肯德基 in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', USA);
      expect(result).toBeNull();
    });

    test('matches PFK in Quebec', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', QUEBEC);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('pfk-a54c14');
    });
    test('matches KFC in Quebec, but sorts PFK first', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', QUEBEC);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('pfk-a54c14');  // quebec area = 1821913 km²
      expect(result[1]).toBe('kfc-658eea');  // world area = 511207893 km²
    });
    test('does not match 肯德基 in Quebec', () => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', QUEBEC);
      expect(result).toBeNull();
    });

    test('matches 肯德基 in China', () => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', HONGKONG);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('kfc-1ff19c');
    });
    test('matches KFC in China, but sorts 肯德基 first', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', HONGKONG);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('kfc-1ff19c');  // china area = 10386875 km²
      expect(result[1]).toBe('kfc-658eea');  // world area = 511207893 km²
    });
    test('does not match PFK in China', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', HONGKONG);
      expect(result).toBeNull();
    });
  });


  describe('transit matching', () => {
    test('match on `network` tag', () => {
      const result = _matcher.match('route', 'train', 'verkehrs und tarifverbund stuttgart');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('match on `network:short` tag', () => {
      const result = _matcher.match('route', 'train', 'VVS');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('match on `network:guid` tag', () => {
      const result = _matcher.match('route', 'train', 'DE-BW-VVS');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('match on `network:wikidata` tag', () => {
      const result = _matcher.match('route', 'train', 'Q2516108');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('does not match on `network:wikipedia` tag', () => {
      const result = _matcher.match('route', 'train', 'de:Verkehrs- und Tarifverbund Stuttgart');
      expect(result).toBeNull();
    });

    test('does not match on route/yes', () => {
      const result = _matcher.match('route', 'yes', 'VVS');
      expect(result).toBeNull();
    });

    test('does not match on building/yes', () => {
      const result = _matcher.match('building', 'yes', 'VVS');
      expect(result).toBeNull();
    });
  });


  describe('flag matching', () => {
    test('match on `flag:name/subject` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'New Zealand');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('newzealand-e5dc93');
    });

    test('match on `country` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'NZ');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('newzealand-e5dc93');
    });

    test('match on `flag:wikidata` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'Q160260');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('newzealand-e5dc93');
    });

    test('match on `subject:wikidata` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'Q664');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('newzealand-e5dc93');
    });

    test('does not match on man_made/yes', () => {
      const result = _matcher.match('man_made', 'yes', 'new zealand');
      expect(result).toBeNull();
    });

    test('does not match on building/yes', () => {
      const result = _matcher.match('building', 'yes', 'new zealand');
      expect(result).toBeNull();
    });
  });

});
