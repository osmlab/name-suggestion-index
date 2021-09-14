import { test } from 'tap';
import LocationConflation from '@ideditor/location-conflation';
import { Matcher } from '../index.mjs';
import data from './matcher.data.json';

// We use LocationConflation for validating and processing the locationSets
import featureCollection from '../dist/featureCollection.json';
const loco = new LocationConflation(featureCollection);

const USA = [-98.58, 39.828];
const QUEBEC = [-71.208, 46.814];
const HONGKONG = [114.19, 22.33];


test('index building', t => {
  t.beforeEach(() => t.context.matcher = new Matcher());
  t.afterEach(() => t.context.matcher = null);

  t.test('buildMatchIndex does not throw', t => {
    t.doesNotThrow(() => t.context.matcher.buildMatchIndex(data));
    t.end();
  });

  t.test('buildLocationIndex does not throw', t => {
    t.doesNotThrow(() => t.context.matcher.buildLocationIndex(data, loco));
    t.end();
  });

  t.test('buildLocationIndex does not throw even with unrecognized locationSet', t => {
    const bad = {
      'brands/amenity/fast_food': {
        properties: { path: 'brands/amenity/fast_food' },
        items: [
          {
            displayName: 'Garbage',
            id: 'garbage-abcdef',
            locationSet: { include: ['garbage'] },
            tags: {}
          }
        ]
      }
    }
    const orig = console.warn;   // silence console.warn
    console.warn = () => {};
    t.doesNotThrow(() => t.context.matcher.buildLocationIndex(bad, loco));
    console.warn = orig;
    t.end();
  });

  t.test('buildLocationIndex does not throw even with empty locationSet', t => {
    const bad = {
      'brands/amenity/fast_food': {
        properties: { path: 'brands/amenity/fast_food' },
        items: [
          {
            displayName: 'Garbage',
            id: 'garbage-abcdef',
            locationSet: { include: ['aq'], exclude: ['aq'] },
            tags: {}
          }
        ]
      }
    }
    const orig = console.warn;   // silence console.warn
    console.warn = () => {};
    t.doesNotThrow(() => t.context.matcher.buildLocationIndex(bad, loco));
    console.warn = orig;
    t.end();
  });

  t.test('match throws if matchIndex not yet built', t => {
    t.throws(() => t.context.matcher.match('amenity', 'fast_food', 'KFC'), 'not built');
    t.end();
  });

  t.end();
});


test('match', t => {
  t.context.matcher = new Matcher();
  t.context.matcher.buildMatchIndex(data);
  t.context.matcher.buildLocationIndex(data, loco);

  // In practice, duplidate ids can't happen anymore.
  // We should find a better way to flag potential duplicates in the index.
  t.test('getWarnings', t => {
    const warnings  = t.context.matcher.getWarnings();
    t.type(warnings, Array);
    t.equal(warnings.length, 0);
    t.end();
  });

  t.test('returns null if no match', t => {
    const result = t.context.matcher.match('amenity', 'fast_food', 'Applebees');
    t.equal(result, null);
    t.end();
  });

  t.test('excluded/generic name matching', t => {
    t.test('matches excluded generic pattern with main tagpair', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Food Court');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      t.equal(result[0].pattern, '/^(fast food|food court)$/i');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.end();
    });

    t.test('match excluded generic pattern with alternate tagpair in matchGroups', t => {
      const result = t.context.matcher.match('amenity', 'cafe', 'Food Court');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      t.equal(result[0].pattern, '/^(fast food|food court)$/i');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.end();
    });
    t.test('match globally excluded generic pattern from genericWords.json', t => {
      const result = t.context.matcher.match('amenity', 'cafe', '???');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      t.equal(result[0].pattern, '/^\\?+$/i');
      t.equal(result[0].kv, undefined);
      t.end();
    });

    t.test('matches excluded name pattern with main tagpair', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Kebabai');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      t.equal(result[0].pattern, '/^(city (grill|pizza)|kebabai)$/i');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.end();
    });
    t.test('match excluded name pattern with alternate tagpair in matchGroups', t => {
      const result = t.context.matcher.match('amenity', 'cafe', 'Kebabai');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      t.equal(result[0].pattern, '/^(city (grill|pizza)|kebabai)$/i');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.end();
    });

    t.end();
  });


  t.test('basic matching, single result', t => {
    t.test('matches exact key/value/name', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Honey Baked Ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');      // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.ok(result[0].area > 21000000);          // usa area ≈ 21817019 km²
      t.ok(result[0].area < 22000000);
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });

    t.test('match on `official_name` tag', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'The Honey Baked Ham Company');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = an alternate tag like `official_name`
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'thehoneybakedhamcompany');
      t.end();
    });

    t.test('match on local `name:*` tag', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Honig Bebackener Schinken');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');      // localized `name:*` tags are 'primary' matches too
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'honigbebackenerschinken');
      t.end();
    });

    t.test('match on `*:wikidata` tag', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Q5893363');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // `brand:wikidata` qid values are 'alternate' matches too
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'q5893363');
      t.end();
    });

    t.test('does not match on `*:wikipedia` tag', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'en:The Honey Baked Ham Company');
      t.equal(result, null);
      t.end();
    });

    t.test('does not match on `*:etymology` tag', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'Ignore Me');
      t.equal(result, null);
      t.end();
    });

    t.test('fuzzy match name', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'HoNeyBaKed\thäm!');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'honeybakedham');    // variations in capitalization, spacing, etc, reduce to the same nsimple
      t.end();
    });

    t.test('match alternate tagpairs in matchTags', t => {
      const result = t.context.matcher.match('shop', 'deli', 'Honey Baked Ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'shop/deli');            // `shop/deli` is alternate pair in matchTags
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });

    t.test('match alternate names in matchNames', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'honey baked ham company');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');             // 'alternate' = matchNames are 'alternate' matches
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'honeybakedhamcompany');   // `honeybakedhamcompany` is alternate name in matchNames
      t.end();
    });

    t.test('match alternate tagpairs in matchGroups', t => {
      const result = t.context.matcher.match('amenity', 'cafe', 'honey baked ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/fast_food');    // amenity/cafe is in matchGroups with amenity/fast_food
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });

    t.test('match generic tagpair amenity/yes', t => {
      const result = t.context.matcher.match('amenity', 'yes', 'honey baked ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'amenity/yes');          // generic tagpair 'amenity/yes'
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });

    t.test('match generic tagpair shop/yes', t => {
      const result = t.context.matcher.match('shop', 'yes', 'honey baked ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');        // the name still makes this a 'primary' match
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'shop/yes');          // will match generic `shop/yes` because `shop` is in matchTags/matchgroups
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });

    t.test('match generic tagpair building/yes', t => {
      const result = t.context.matcher.match('building', 'yes', 'honey baked ham');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      t.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      t.equal(result[0].kv, 'building/yes');         // generic tagpair 'building/yes'
      t.equal(result[0].nsimple, 'honeybakedham');
      t.end();
    });
    t.end();
  });


  t.test('advanced matching, multiple result', t => {
    t.test('matches KFC with unspecified location, results sort by area descending', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'KFC');
      t.type(result, Array)
      t.equal(result.length, 3);

      t.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'kfc-658eea');        // KFC worldwide
      t.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      t.ok(result[0].area < 520000000);
      t.equal(result[0].kv, 'amenity/fast_food');
      t.equal(result[0].nsimple, 'kfc');

      t.equal(result[1].match, 'primary');            // 'primary' = matched the `name:en` tag
      t.equal(result[1].itemID, 'kfc-1ff19c');        // KFC China
      t.ok(result[1].area > 10000000);                // china area ≈ 10386875 km²
      t.ok(result[1].area < 11000000);
      t.equal(result[1].kv, 'amenity/fast_food');
      t.equal(result[1].nsimple, 'kfc');

      t.equal(result[2].match, 'primary');            // 'primary' = matched the `name:en` tag
      t.equal(result[2].itemID, 'pfk-a54c14');        // KFC Quebec ("PFK")
      t.ok(result[2].area > 1800000);                 // quebec area ≈ 1821913 km²
      t.ok(result[2].area < 1900000);
      t.equal(result[2].kv, 'amenity/fast_food');
      t.equal(result[2].nsimple, 'kfc');
      t.end();
    });

    t.test('matches KFC in USA', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'KFC', USA);
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'kfc-658eea');    // KFC worldwide
      t.end();
    });
    t.test('does not match PFK in USA', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'PFK', USA);
      t.equal(result, null);
      t.end();
    });
    t.test('does not match 肯德基 in USA', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', '肯德基', USA);
      t.equal(result, null);
      t.end();
    });

    t.test('matches PFK in Quebec', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'PFK', QUEBEC);
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'pfk-a54c14');
      t.end();
    });
    t.test('matches KFC in Quebec, but sorts PFK first', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'KFC', QUEBEC);
      t.type(result, Array)
      t.equal(result.length, 2);
      t.equal(result[0].match, 'primary');        // 'primary' = matched the `name:en` tag
      t.equal(result[0].itemID, 'pfk-a54c14');    // quebec area = 1821913 km²
      t.equal(result[1].match, 'primary');        // 'primary' = matched the `name` tag
      t.equal(result[1].itemID, 'kfc-658eea');    // world area = 511207893 km²
      t.end();
    });
    t.test('does not match 肯德基 in Quebec', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', '肯德基', QUEBEC);
      t.equal(result, null);
      t.end();
    });

    t.test('matches 肯德基 in China', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', '肯德基', HONGKONG);
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'kfc-1ff19c');
      t.end();
    });
    t.test('matches KFC in China, but sorts 肯德基 first', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'KFC', HONGKONG);
      t.type(result, Array)
      t.equal(result.length, 2);
      t.equal(result[0].match, 'primary');        // 'primary' = matched the `name:en` tag
      t.equal(result[0].itemID, 'kfc-1ff19c');    // china area = 10386875 km²
      t.equal(result[1].match, 'primary');        // 'primary' = matched the `name` tag
      t.equal(result[1].itemID, 'kfc-658eea');    // world area = 511207893 km²
      t.end();
    });
    t.test('does not match PFK in China', t => {
      const result = t.context.matcher.match('amenity', 'fast_food', 'PFK', HONGKONG);
      t.equal(result, null);
      t.end();
    });

    t.test('matches Gap with unspecified location, sorts primary before alternate', t => {
      const result = t.context.matcher.match('shop', 'clothes', 'Gap');
      t.type(result, Array)
      t.equal(result.length, 2);

      t.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'gap-3937bd');        // Gap worldwide
      t.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      t.ok(result[0].area < 520000000);
      t.equal(result[0].kv, 'shop/clothes');
      t.equal(result[0].nsimple, 'gap');

      t.equal(result[1].match, 'alternate');          // 'alternate' = matched the `brand` tag
      t.equal(result[1].itemID, 'babygap-0a21d9');    // Baby Gap
      t.ok(result[1].area > 21000000);                // usa area ≈ 21817019 km²
      t.ok(result[1].area < 22000000);
      t.equal(result[1].kv, 'shop/clothes');
      t.equal(result[1].nsimple, 'gap');
      t.end();
    });

    t.test('matches Baby Gap with unspecified location, sorts primary before alternate', t => {
      const result = t.context.matcher.match('shop', 'clothes', 'Baby Gap');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      t.equal(result[0].itemID, 'babygap-0a21d9');    // Baby Gap
      t.ok(result[0].area > 21000000);                // usa area ≈ 21817019 km²
      t.ok(result[0].area < 22000000);
      t.equal(result[0].kv, 'shop/clothes');
      t.equal(result[0].nsimple, 'babygap');
      t.end();
    });

    t.end();
  });


  t.test('transit matching', t => {
    t.test('match on `network` tag', t => {
      const result = t.context.matcher.match('route', 'train', 'verkehrs und tarifverbund stuttgart');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');      // 'primary' = matched the `network` tag
      t.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
      t.equal(result[0].kv, 'route/train');
      t.equal(result[0].nsimple, 'verkehrsundtarifverbundstuttgart');
      t.end();
    });

    t.test('match on `network:short` tag', t => {
      const result = t.context.matcher.match('route', 'train', 'VVS');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:short` tag
      t.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
      t.end();
    });

    t.test('match on `network:guid` tag', t => {
      const result = t.context.matcher.match('route', 'train', 'DE-BW-VVS');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:guid` tag
      t.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
      t.end();
    });

    t.test('match on `network:wikidata` tag', t => {
      const result = t.context.matcher.match('route', 'train', 'Q2516108');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:wikidata` tag
      t.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
      t.end();
    });

    t.test('does not match on `network:wikipedia` tag', t => {
      const result = t.context.matcher.match('route', 'train', 'de:Verkehrs- und Tarifverbund Stuttgart');
      t.equal(result, null);
      t.end();
    });

    t.test('does not match on route/yes', t => {
      const result = t.context.matcher.match('route', 'yes', 'VVS');
      t.equal(result, null);
      t.end();
    });

    t.test('does not match on building/yes', t => {
      const result = t.context.matcher.match('building', 'yes', 'VVS');
      t.equal(result, null);
      t.end();
    });

    t.end();
  });


  t.test('flag matching', t => {
    t.test('match on `flag:name/subject` tag', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'New Zealand');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');    // 'primary' = matched the `flag:name` tag
      t.equal(result[0].itemID, 'newzealand-e5dc93');
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'newzealand');

      // Matching "New Zealand" in the `subject` tag would be an 'alternate' match,
      // but we already returned it as a 'primary' match, so shouldn't see another result for it.
      t.end();
    });

    t.test('match on `country` tag', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'NZ');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `country` tag
      t.equal(result[0].itemID, 'newzealand-e5dc93');
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'nz');
      t.end();
    });

    t.test('match on `flag:wikidata` tag', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'Q160260');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `flag:wikidata` tag
      t.equal(result[0].itemID, 'newzealand-e5dc93');
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'q160260');
      t.end();
    });

    t.test('match on `subject:wikidata` tag', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'Q664');
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'alternate');    // 'alternate' = matched the `subject:wikidata` tag
      t.equal(result[0].itemID, 'newzealand-e5dc93');
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'q664');
      t.end();
    });

    t.test('does not match on man_made/yes', t => {
      const result = t.context.matcher.match('man_made', 'yes', 'new zealand');
      t.equal(result, null);
      t.end();
    });

    t.test('does not match on building/yes', t => {
      const result = t.context.matcher.match('building', 'yes', 'new zealand');
      t.equal(result, null);
      t.end();
    });

    t.test('matches state flag of Georgia before country flag of Georgia in USA', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'georgia', USA);
      t.type(result, Array)
      t.equal(result.length, 2);

      t.equal(result[0].match, 'primary');            // 'primary' = matched the `flag:name` tag
      t.equal(result[0].itemID, 'georgia-85bb3f');    // Georgia, the US state
      t.ok(result[0].area > 21000000);                // usa area ≈ 21817019 km²
      t.ok(result[0].area < 22000000);
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'georgia');

      t.equal(result[1].match, 'primary');            // 'primary' = matched the `flag:name` tag
      t.equal(result[1].itemID, 'georgia-e5dc93');    // Georgia, the country
      t.ok(result[1].area > 510000000);               // world area ≈ 511207893 km²
      t.ok(result[1].area < 520000000);
      t.equal(result[1].kv, 'man_made/flagpole');
      t.equal(result[1].nsimple, 'georgia');
      t.end();
    });

    t.test('matches only country flag of Georgia outside the USA', t => {
      const result = t.context.matcher.match('man_made', 'flagpole', 'georgia', HONGKONG);
      t.type(result, Array)
      t.equal(result.length, 1);
      t.equal(result[0].match, 'primary');            // 'primary' = matched the `flag:name` tag
      t.equal(result[0].itemID, 'georgia-e5dc93');    // Georgia, the country
      t.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      t.ok(result[0].area < 520000000);
      t.equal(result[0].kv, 'man_made/flagpole');
      t.equal(result[0].nsimple, 'georgia');
      t.end();
    });

    t.end();
  });

  t.end();
});
