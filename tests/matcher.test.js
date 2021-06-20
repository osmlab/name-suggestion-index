const Matcher = require('../lib/matcher.js');
const data = require('./matcher.data.json');

// We use LocationConflation for validating and processing the locationSets
const featureCollection = require('../dist/featureCollection.json');
const LocationConflation = require('@ideditor/location-conflation').default;
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

  test('buildLocationIndex does not throw even with unrecognized locationSet', () => {
    const bad = {
      'brands/amenity/fast_food': {
        'properties': { 'path': 'brands/amenity/fast_food' },
        'items': [
          {
            displayName: 'Garbage',
            id: 'garbage-abcdef',
            locationSet: {'include': ['garbage']},
            tags: {}
          }
        ]
      }
    }
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});   // mock console.warn
    expect(() => _matcher.buildLocationIndex(bad, loco)).not.toThrow();
    spy.mockRestore();
  });

  test('buildLocationIndex does not throw even with empty locationSet', () => {
    const bad = {
      'brands/amenity/fast_food': {
        'properties': { 'path': 'brands/amenity/fast_food' },
        'items': [
          {
            displayName: 'Garbage',
            id: 'garbage-abcdef',
            locationSet: {'include': ['aq'], 'exclude': ['aq']},
            tags: {}
          }
        ]
      }
    }
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});   // mock console.warn
    expect(() => _matcher.buildLocationIndex(bad, loco)).not.toThrow();
    spy.mockRestore();
  });

  test('match throws if matchIndex not yet built', () => {
    expect(() => _matcher.match('amenity', 'fast_food', 'KFC')).toThrow('not built');
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

  describe('excluded/generic name matching', () => {
    test('matches excluded generic pattern with main tagpair', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Food Court');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      expect(result[0].pattern).toBe('/^(fast food|food court)$/i');
      expect(result[0].kv).toBe('amenity/fast_food');
    });
    test('match excluded generic pattern with alternate tagpair in matchGroups', () => {
      const result = _matcher.match('amenity', 'cafe', 'Food Court');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      expect(result[0].pattern).toBe('/^(fast food|food court)$/i');
      expect(result[0].kv).toBe('amenity/fast_food');
    });
    test('match globally excluded generic pattern from genericWords.json', () => {
      const result = _matcher.match('amenity', 'cafe', '???');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      expect(result[0].pattern).toBe('/^\\?+$/i');
      expect(result[0].kv).toBeUndefined();
    });

    test('matches excluded name pattern with main tagpair', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Kebabai');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      expect(result[0].pattern).toBe('/^(city (grill|pizza)|kebabai)$/i');
      expect(result[0].kv).toBe('amenity/fast_food');
    });
    test('match excluded name pattern with alternate tagpair in matchGroups', () => {
      const result = _matcher.match('amenity', 'cafe', 'Kebabai');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      expect(result[0].pattern).toBe('/^(city (grill|pizza)|kebabai)$/i');
      expect(result[0].kv).toBe('amenity/fast_food');
    });
  });


  describe('basic matching, single result', () => {
    test('matches exact key/value/name', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Honey Baked Ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');      // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].area).toBeGreaterThan(20000000);  // usa area ≈ 21817019 km²
      expect(result[0].area).toBeLessThan(500000000);
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('honeybakedham');
    });

    test('match on `official_name` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'The Honey Baked Ham Company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = an alternate tag like `official_name`
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('thehoneybakedhamcompany');
    });

    test('match on local `name:*` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Honig Bebackener Schinken');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');      // localized `name:*` tags are 'primary' matches too
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('honigbebackenerschinken');
    });

    test('match on `*:wikidata` tag', () => {
      const result = _matcher.match('amenity', 'fast_food', 'Q5893363');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // `brand:wikidata` qid values are 'alternate' matches too
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('q5893363');
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
      expect(result[0].match).toBe('primary');
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('honeybakedham');    // variations in capitalization, spacing, etc, reduce to the same nsimple
    });

    test('match alternate tagpairs in matchTags', () => {
      const result = _matcher.match('shop', 'deli', 'Honey Baked Ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');           // the name still makes this a 'primary' match
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('shop/deli');            // `shop/deli` is alternate pair in matchTags
      expect(result[0].nsimple).toBe('honeybakedham');
    });

    test('match alternate names in matchNames', () => {
      const result = _matcher.match('amenity', 'fast_food', 'honey baked ham company');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');             // 'alternate' = matchNames are 'alternate' matches
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('honeybakedhamcompany');   // `honeybakedhamcompany` is alternate name in matchNames
    });

    test('match alternate tagpairs in matchGroups', () => {
      const result = _matcher.match('amenity', 'cafe', 'honey baked ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');           // the name still makes this a 'primary' match
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/fast_food');    // amenity/cafe is in matchGroups with amenity/fast_food
      expect(result[0].nsimple).toBe('honeybakedham');
    });

    test('match generic tagpair amenity/yes', () => {
      const result = _matcher.match('amenity', 'yes', 'honey baked ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');           // the name still makes this a 'primary' match
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('amenity/yes');          // generic tagpair 'amenity/yes'
      expect(result[0].nsimple).toBe('honeybakedham');
    });

    test('match generic tagpair shop/yes', () => {
      const result = _matcher.match('shop', 'yes', 'honey baked ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');        // the name still makes this a 'primary' match
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('shop/yes');          // will match generic `shop/yes` because `shop` is in matchTags/matchgroups
      expect(result[0].nsimple).toBe('honeybakedham');
    });

    test('match generic tagpair building/yes', () => {
      const result = _matcher.match('building', 'yes', 'honey baked ham');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');           // the name still makes this a 'primary' match
      expect(result[0].itemID).toBe('honeybakedham-4d2ff4');
      expect(result[0].kv).toBe('building/yes');         // generic tagpair 'building/yes'
      expect(result[0].nsimple).toBe('honeybakedham');
    });
  });


  describe('advanced matching, multiple result', () => {
    test('matches KFC with unspecified location, results sort by area descending', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);

      expect(result[0].match).toBe('primary');            // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('kfc-658eea');        // KFC worldwide
      expect(result[0].area).toBeGreaterThan(500000000);  // world area ≈ 511207893 km²
      expect(result[0].area).toBeLessThan(600000000);
      expect(result[0].kv).toBe('amenity/fast_food');
      expect(result[0].nsimple).toBe('kfc');

      expect(result[1].match).toBe('primary');            // 'primary' = matched the `name:en` tag
      expect(result[1].itemID).toBe('kfc-1ff19c');        // KFC China
      expect(result[1].area).toBeGreaterThan(10000000);   // china area ≈ 10386875 km²
      expect(result[1].area).toBeLessThan(20000000);
      expect(result[1].kv).toBe('amenity/fast_food');
      expect(result[1].nsimple).toBe('kfc');

      expect(result[2].match).toBe('primary');            // 'primary' = matched the `name:en` tag
      expect(result[2].itemID).toBe('pfk-a54c14');        // KFC Quebec ("PFK")
      expect(result[2].area).toBeGreaterThan(1000000);    // quebec area ≈ 1821913 km²
      expect(result[2].area).toBeLessThan(2000000);
      expect(result[2].kv).toBe('amenity/fast_food');
      expect(result[2].nsimple).toBe('kfc');
    });

    test('matches KFC in USA', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', USA);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');        // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('kfc-658eea');    // KFC worldwide
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
      expect(result[0].match).toBe('primary');        // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('pfk-a54c14');
    });
    test('matches KFC in Quebec, but sorts PFK first', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', QUEBEC);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0].match).toBe('primary');        // 'primary' = matched the `name:en` tag
      expect(result[0].itemID).toBe('pfk-a54c14');    // quebec area = 1821913 km²
      expect(result[1].match).toBe('primary');        // 'primary' = matched the `name` tag
      expect(result[1].itemID).toBe('kfc-658eea');    // world area = 511207893 km²
    });
    test('does not match 肯德基 in Quebec', () => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', QUEBEC);
      expect(result).toBeNull();
    });

    test('matches 肯德基 in China', () => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', HONGKONG);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');        // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('kfc-1ff19c');
    });
    test('matches KFC in China, but sorts 肯德基 first', () => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', HONGKONG);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0].match).toBe('primary');        // 'primary' = matched the `name:en` tag
      expect(result[0].itemID).toBe('kfc-1ff19c');    // china area = 10386875 km²
      expect(result[1].match).toBe('primary');        // 'primary' = matched the `name` tag
      expect(result[1].itemID).toBe('kfc-658eea');    // world area = 511207893 km²
    });
    test('does not match PFK in China', () => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', HONGKONG);
      expect(result).toBeNull();
    });

    test('matches Gap with unspecified location, sorts primary before alternate', () => {
      const result = _matcher.match('shop', 'clothes', 'Gap');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);

      expect(result[0].match).toBe('primary');            // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('gap-3937bd');        // Gap worldwide
      expect(result[0].area).toBeGreaterThan(500000000);  // world area ≈ 511207893 km²
      expect(result[0].area).toBeLessThan(600000000);
      expect(result[0].kv).toBe('shop/clothes');
      expect(result[0].nsimple).toBe('gap');

      expect(result[1].match).toBe('alternate');          // 'alternate' = matched the `brand` tag
      expect(result[1].itemID).toBe('babygap-0a21d9');    // Baby Gap
      expect(result[1].area).toBeGreaterThan(20000000);   // usa area ≈ 21817019 km²
      expect(result[1].area).toBeLessThan(500000000);
      expect(result[1].kv).toBe('shop/clothes');
      expect(result[1].nsimple).toBe('gap');
    });

    test('matches Baby Gap with unspecified location, sorts primary before alternate', () => {
      const result = _matcher.match('shop', 'clothes', 'Baby Gap');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');            // 'primary' = matched the `name` tag
      expect(result[0].itemID).toBe('babygap-0a21d9');    // Baby Gap
      expect(result[0].area).toBeGreaterThan(20000000);   // usa area ≈ 21817019 km²
      expect(result[0].area).toBeLessThan(500000000);
      expect(result[0].kv).toBe('shop/clothes');
      expect(result[0].nsimple).toBe('babygap');
    });
  });


  describe('transit matching', () => {
    test('match on `network` tag', () => {
      const result = _matcher.match('route', 'train', 'verkehrs und tarifverbund stuttgart');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');      // 'primary' = matched the `network` tag
      expect(result[0].itemID).toBe('verkehrsundtarifverbundstuttgart-da20e0');
      expect(result[0].kv).toBe('route/train');
      expect(result[0].nsimple).toBe('verkehrsundtarifverbundstuttgart');
    });

    test('match on `network:short` tag', () => {
      const result = _matcher.match('route', 'train', 'VVS');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `network:short` tag
      expect(result[0].itemID).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('match on `network:guid` tag', () => {
      const result = _matcher.match('route', 'train', 'DE-BW-VVS');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `network:guid` tag
      expect(result[0].itemID).toBe('verkehrsundtarifverbundstuttgart-da20e0');
    });

    test('match on `network:wikidata` tag', () => {
      const result = _matcher.match('route', 'train', 'Q2516108');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `network:wikidata` tag
      expect(result[0].itemID).toBe('verkehrsundtarifverbundstuttgart-da20e0');
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
      expect(result[0].match).toBe('primary');    // 'primary' = matched the `flag:name` tag
      expect(result[0].itemID).toBe('newzealand-e5dc93');
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('newzealand');

      // Matching "New Zealand" in the `subject` tag would be an 'alternate' match,
      // but we already returned it as a 'primary' match, so shouldn't see another result for it.
    });

    test('match on `country` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'NZ');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `country` tag
      expect(result[0].itemID).toBe('newzealand-e5dc93');
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('nz');
    });

    test('match on `flag:wikidata` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'Q160260');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `flag:wikidata` tag
      expect(result[0].itemID).toBe('newzealand-e5dc93');
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('q160260');
    });

    test('match on `subject:wikidata` tag', () => {
      const result = _matcher.match('man_made', 'flagpole', 'Q664');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('alternate');    // 'alternate' = matched the `subject:wikidata` tag
      expect(result[0].itemID).toBe('newzealand-e5dc93');
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('q664');
    });

    test('does not match on man_made/yes', () => {
      const result = _matcher.match('man_made', 'yes', 'new zealand');
      expect(result).toBeNull();
    });

    test('does not match on building/yes', () => {
      const result = _matcher.match('building', 'yes', 'new zealand');
      expect(result).toBeNull();
    });

    test('matches state flag of Georgia before country flag of Georgia in USA', () => {
      const result = _matcher.match('man_made', 'flagpole', 'georgia', USA);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);

      expect(result[0].match).toBe('primary');            // 'primary' = matched the `flag:name` tag
      expect(result[0].itemID).toBe('georgia-85bb3f');    // Georgia, the US state
      expect(result[0].area).toBeGreaterThan(20000000);   // usa area ≈ 21817019 km²
      expect(result[0].area).toBeLessThan(500000000);
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('georgia');

      expect(result[1].match).toBe('primary');            // 'primary' = matched the `flag:name` tag
      expect(result[1].itemID).toBe('georgia-e5dc93');    // Georgia, the country
      expect(result[1].area).toBeGreaterThan(500000000);  // world area ≈ 511207893 km²
      expect(result[1].area).toBeLessThan(600000000);
      expect(result[1].kv).toBe('man_made/flagpole');
      expect(result[1].nsimple).toBe('georgia');
    });

    test('matches only country flag of Georgia outside the USA', () => {
      const result = _matcher.match('man_made', 'flagpole', 'georgia', HONGKONG);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].match).toBe('primary');            // 'primary' = matched the `flag:name` tag
      expect(result[0].itemID).toBe('georgia-e5dc93');    // Georgia, the country
      expect(result[0].area).toBeGreaterThan(500000000);  // world area ≈ 511207893 km²
      expect(result[0].area).toBeLessThan(600000000);
      expect(result[0].kv).toBe('man_made/flagpole');
      expect(result[0].nsimple).toBe('georgia');
    });
  });

});
