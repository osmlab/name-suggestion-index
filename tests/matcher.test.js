import { after, before, test } from 'node:test';
import { strict as assert } from 'node:assert';
import LocationConflation from '@rapideditor/location-conflation';
import { Matcher } from '../index.mjs';

import data from './matcher.data.json' with {type: 'json'};

// We use LocationConflation for validating and processing the locationSets
import featureCollection from '../dist/featureCollection.json' with {type: 'json'};
const loco = new LocationConflation(featureCollection);

const USA = [-98.58, 39.828];
const QUEBEC = [-71.208, 46.814];
const HONGKONG = [114.19, 22.33];


test('index building', async t => {
  let _matcher, _warn;

  t.before(() => {
    _warn = console.warn;
    console.warn = () => {};  // silence console.warn
  });

  t.after(() => {
    console.warn = _warn;
  });

  t.beforeEach(() => {
    _matcher = new Matcher();
  });

  t.afterEach(() => {
    _matcher = null;
  });

  await t.test('buildMatchIndex does not throw', t => {
    assert.doesNotThrow(() => _matcher.buildMatchIndex(data));
  });

  await t.test('buildLocationIndex does not throw', t => {
    assert.doesNotThrow(() => _matcher.buildLocationIndex(data, loco));
  });

  await t.test('buildLocationIndex does not throw even with unrecognized locationSet', t => {
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
    assert.doesNotThrow(() => _matcher.buildLocationIndex(bad, loco));
  });

  await t.test('buildLocationIndex does not throw even with empty locationSet', t => {
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
    assert.doesNotThrow(() => _matcher.buildLocationIndex(bad, loco));
  });

  await t.test('match throws if matchIndex not yet built', t => {
    assert.throws(() => _matcher.match('amenity', 'fast_food', 'KFC'), 'not built');
  });
});


test('match', async t => {
  let _matcher;

  t.before(() => {
    _matcher = new Matcher();
    _matcher.buildMatchIndex(data);
    _matcher.buildLocationIndex(data, loco);
  });

  // In practice, duplidate ids can't happen anymore.
  // We should find a better way to flag potential duplicates in the index.
  await t.test('getWarnings', t => {
    const warnings  = _matcher.getWarnings();
    assert.ok(warnings instanceof Array);
    assert.equal(warnings.length, 0);
  });

  await t.test('returns null if no match', t => {
    const result = _matcher.match('amenity', 'fast_food', 'Applebees');
    assert.equal(result, null);
  });

  await t.test('excluded/generic name matching', async t => {
    await t.test('matches excluded generic pattern with main tagpair', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Food Court');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      assert.equal(result[0].pattern, '/^(fast food|food court)$/i');
      assert.equal(result[0].kv, 'amenity/fast_food');
    });

    await t.test('match excluded generic pattern with alternate tagpair in matchGroups', t => {
      const result = _matcher.match('amenity', 'cafe', 'Food Court');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      assert.equal(result[0].pattern, '/^(fast food|food court)$/i');
      assert.equal(result[0].kv, 'amenity/fast_food');
    });

    await t.test('match globally excluded generic pattern from genericWords.json', t => {
      const result = _matcher.match('amenity', 'cafe', '???');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeGeneric');      // 'excludeGeneric' = matched a generic exclude pattern
      assert.equal(result[0].pattern, '/^\\?+$/i');
      assert.equal(result[0].kv, undefined);
    });

    await t.test('matches excluded name pattern with main tagpair', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Kebabai');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      assert.equal(result[0].pattern, '/^(city (grill|pizza)|kebabai)$/i');
      assert.equal(result[0].kv, 'amenity/fast_food');
    });

    await t.test('match excluded name pattern with alternate tagpair in matchGroups', t => {
      const result = _matcher.match('amenity', 'cafe', 'Kebabai');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeNamed');      // 'excludeNamed' = matched a named exclude pattern
      assert.equal(result[0].pattern, '/^(city (grill|pizza)|kebabai)$/i');
      assert.equal(result[0].kv, 'amenity/fast_food');
    });
  });

  await t.test('basic matching, single result', async t => {
    await t.test('matches exact key/value/name', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Honey Baked Ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');      // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.ok(result[0].area > 21000000);          // usa area ≈ 21817019 km²
      assert.ok(result[0].area < 22000000);
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'honeybakedham');
    });

    await t.test('match on `official_name` tag', t => {
      const result = _matcher.match('amenity', 'fast_food', 'The Honey Baked Ham Company');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = an alternate tag like `official_name`
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'thehoneybakedhamcompany');
    });

    await t.test('match on local `name:*` tag', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Honig Bebackener Schinken');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');      // localized `name:*` tags are 'primary' matches too
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'honigbebackenerschinken');
    });

    await t.test('match on `*:wikidata` tag', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Q5893363');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // `brand:wikidata` qid values are 'alternate' matches too
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'q5893363');
    });

    await t.test('does not match on `*:etymology` tag', t => {
      const result = _matcher.match('amenity', 'fast_food', 'Ignore Me');
      assert.equal(result, null);
    });

    await t.test('fuzzy match name', t => {
      const result = _matcher.match('amenity', 'fast_food', 'HoNeyBaKed\thäm!');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'honeybakedham');    // variations in capitalization, spacing, etc, reduce to the same nsimple
    });

    await t.test('match alternate tagpairs in matchTags', t => {
      const result = _matcher.match('shop', 'butcher', 'Honey Baked Ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'shop/butcher');            // `shop/butcher` is alternate pair in matchTags
      assert.equal(result[0].nsimple, 'honeybakedham');
    });

    await t.test('match alternate names in matchNames', t => {
      const result = _matcher.match('amenity', 'fast_food', 'honey baked ham company');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');             // 'alternate' = matchNames are 'alternate' matches
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'honeybakedhamcompany');   // `honeybakedhamcompany` is alternate name in matchNames
    });

    await t.test('match alternate tagpairs in matchGroups', t => {
      const result = _matcher.match('amenity', 'cafe', 'honey baked ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/fast_food');    // amenity/cafe is in matchGroups with amenity/fast_food
      assert.equal(result[0].nsimple, 'honeybakedham');
    });

    await t.test('match generic tagpair amenity/yes', t => {
      const result = _matcher.match('amenity', 'yes', 'honey baked ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'amenity/yes');          // generic tagpair 'amenity/yes'
      assert.equal(result[0].nsimple, 'honeybakedham');
    });

    await t.test('match generic tagpair shop/yes', t => {
      const result = _matcher.match('shop', 'yes', 'honey baked ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');        // the name still makes this a 'primary' match
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'shop/yes');          // will match generic `shop/yes` because `shop` is in matchTags/matchgroups
      assert.equal(result[0].nsimple, 'honeybakedham');
    });

    await t.test('match generic tagpair building/yes', t => {
      const result = _matcher.match('building', 'yes', 'honey baked ham');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');           // the name still makes this a 'primary' match
      assert.equal(result[0].itemID, 'honeybakedham-4d2ff4');
      assert.equal(result[0].kv, 'building/yes');         // generic tagpair 'building/yes'
      assert.equal(result[0].nsimple, 'honeybakedham');
    });
  });


  await t.test('advanced matching, multiple result', async t => {
    await t.test('matches KFC with unspecified location, results sort by area descending', t => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 3);

      assert.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'kfc-658eea');        // KFC worldwide
      assert.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      assert.ok(result[0].area < 520000000);
      assert.equal(result[0].kv, 'amenity/fast_food');
      assert.equal(result[0].nsimple, 'kfc');

      assert.equal(result[1].match, 'primary');            // 'primary' = matched the `name:en` tag
      assert.equal(result[1].itemID, 'kfc-1ff19c');        // KFC China
      assert.ok(result[1].area > 10000000);                // china area ≈ 10386875 km²
      assert.ok(result[1].area < 11000000);
      assert.equal(result[1].kv, 'amenity/fast_food');
      assert.equal(result[1].nsimple, 'kfc');

      assert.equal(result[2].match, 'primary');            // 'primary' = matched the `name:en` tag
      assert.equal(result[2].itemID, 'pfk-a54c14');        // KFC Quebec ("PFK")
      assert.ok(result[2].area > 1800000);                 // quebec area ≈ 1821913 km²
      assert.ok(result[2].area < 1900000);
      assert.equal(result[2].kv, 'amenity/fast_food');
      assert.equal(result[2].nsimple, 'kfc');
    });

    await t.test('matches KFC in USA', t => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', USA);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'kfc-658eea');    // KFC worldwide
    });

    await t.test('does not match PFK in USA', t => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', USA);
      assert.equal(result, null);
    });

    await t.test('does not match 肯德基 in USA', t => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', USA);
      assert.equal(result, null);
    });

    await t.test('matches PFK in Quebec', t => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', QUEBEC);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'pfk-a54c14');
    });

    await t.test('matches KFC in Quebec, but sorts PFK first', t => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', QUEBEC);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 2);
      assert.equal(result[0].match, 'primary');        // 'primary' = matched the `name:en` tag
      assert.equal(result[0].itemID, 'pfk-a54c14');    // quebec area = 1821913 km²
      assert.equal(result[1].match, 'primary');        // 'primary' = matched the `name` tag
      assert.equal(result[1].itemID, 'kfc-658eea');    // world area = 511207893 km²
    });

    await t.test('does not match 肯德基 in Quebec', t => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', QUEBEC);
      assert.equal(result, null);
    });

    await t.test('matches 肯德基 in China', t => {
      const result = _matcher.match('amenity', 'fast_food', '肯德基', HONGKONG);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');        // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'kfc-1ff19c');
    });

    await t.test('matches KFC in China, but sorts 肯德基 first', t => {
      const result = _matcher.match('amenity', 'fast_food', 'KFC', HONGKONG);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 2);
      assert.equal(result[0].match, 'primary');        // 'primary' = matched the `name:en` tag
      assert.equal(result[0].itemID, 'kfc-1ff19c');    // china area = 10386875 km²
      assert.equal(result[1].match, 'primary');        // 'primary' = matched the `name` tag
      assert.equal(result[1].itemID, 'kfc-658eea');    // world area = 511207893 km²
    });

    await t.test('does not match PFK in China', t => {
      const result = _matcher.match('amenity', 'fast_food', 'PFK', HONGKONG);
      assert.equal(result, null);
    });

    await t.test('matches Gap with unspecified location, sorts primary before alternate', t => {
      const result = _matcher.match('shop', 'clothes', 'Gap');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 2);

      assert.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'gap-3937bd');        // Gap worldwide
      assert.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      assert.ok(result[0].area < 520000000);
      assert.equal(result[0].kv, 'shop/clothes');
      assert.equal(result[0].nsimple, 'gap');

      assert.equal(result[1].match, 'alternate');          // 'alternate' = matched the `brand` tag
      assert.equal(result[1].itemID, 'babygap-0a21d9');    // Baby Gap
      assert.ok(result[1].area > 21000000);                // usa area ≈ 21817019 km²
      assert.ok(result[1].area < 22000000);
      assert.equal(result[1].kv, 'shop/clothes');
      assert.equal(result[1].nsimple, 'gap');
    });

    await t.test('matches Baby Gap with unspecified location, sorts primary before alternate', t => {
      const result = _matcher.match('shop', 'clothes', 'Baby Gap');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');            // 'primary' = matched the `name` tag
      assert.equal(result[0].itemID, 'babygap-0a21d9');    // Baby Gap
      assert.ok(result[0].area > 21000000);                // usa area ≈ 21817019 km²
      assert.ok(result[0].area < 22000000);
      assert.equal(result[0].kv, 'shop/clothes');
      assert.equal(result[0].nsimple, 'babygap');
    });
  });

  await t.test('nothing bad happens if a k/v category is present in multiple trees', async t => {
    await t.test('matches an item from the brands tree', t => {
      const result = _matcher.match('amenity', 'post_office', 'UPS');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');      // 'alternate' = matched the `short_name` tag
      assert.equal(result[0].itemID, 'theupsstore-d4e3fc');
      assert.equal(result[0].kv, 'amenity/post_office');
      assert.equal(result[0].nsimple, 'ups');
    });

    await t.test('matches an item from the operators tree', t => {
      const result = _matcher.match('amenity', 'post_office', 'USPS');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');      // 'alternate' = matched the `short_name` tag
      assert.equal(result[0].itemID, 'unitedstatespostalservice-b9aa24');
      assert.equal(result[0].kv, 'amenity/post_office');
    });

    await t.test('matches a generic from the brands tree', t => {
      const result = _matcher.match('amenity', 'post_office', 'Copyshop');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeNamed');   // 'excludeNamed' = matched a named exclude pattern
      assert.equal(result[0].pattern, '/^copyshop$/i');
      assert.equal(result[0].kv, 'amenity/post_office');
    });

    await t.test('matches a generic from the operators tree', t => {
      const result = _matcher.match('amenity', 'post_office', 'Spar');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'excludeNamed');   // 'excludeNamed' = matched a named exclude pattern
      assert.equal(result[0].pattern, '/^spar$/i');
      assert.equal(result[0].kv, 'amenity/post_office');
    });
  });

  await t.test('transit matching', async t => {
    await t.test('match on `network` tag', t => {
      const result = _matcher.match('route', 'train', 'verkehrs und tarifverbund stuttgart');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');      // 'primary' = matched the `network` tag
      assert.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
      assert.equal(result[0].kv, 'route/train');
      assert.equal(result[0].nsimple, 'verkehrsundtarifverbundstuttgart');
    });

    await t.test('match on `network:short` tag', t => {
      const result = _matcher.match('route', 'train', 'VVS');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:short` tag
      assert.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
    });

    await t.test('match on `network:guid` tag', t => {
      const result = _matcher.match('route', 'train', 'DE-BW-VVS');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:guid` tag
      assert.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
    });

    await t.test('match on `network:wikidata` tag', t => {
      const result = _matcher.match('route', 'train', 'Q2516108');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `network:wikidata` tag
      assert.equal(result[0].itemID, 'verkehrsundtarifverbundstuttgart-da20e0');
    });

    await t.test('does not match on route/yes', t => {
      const result = _matcher.match('route', 'yes', 'VVS');
      assert.equal(result, null);
    });

    await t.test('does not match on building/yes', t => {
      const result = _matcher.match('building', 'yes', 'VVS');
      assert.equal(result, null);
    });
  });


  await t.test('flag matching', async t => {
    await t.test('match on `flag:name/subject` tag', t => {
      const result = _matcher.match('man_made', 'flagpole', 'New Zealand');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');    // 'primary' = matched the `flag:name` tag
      assert.equal(result[0].itemID, 'newzealand-e5dc93');
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'newzealand');

      // Matching "New Zealand" in the `subject` tag would be an 'alternate' match,
      // but we already returned it as a 'primary' match, so shouldn't see another result for it.
    });

    await t.test('match on `country` tag', t => {
      const result = _matcher.match('man_made', 'flagpole', 'NZ');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `country` tag
      assert.equal(result[0].itemID, 'newzealand-e5dc93');
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'nz');
    });

    await t.test('match on `flag:wikidata` tag', t => {
      const result = _matcher.match('man_made', 'flagpole', 'Q160260');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `flag:wikidata` tag
      assert.equal(result[0].itemID, 'newzealand-e5dc93');
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'q160260');
    });

    await t.test('match on `subject:wikidata` tag', t => {
      const result = _matcher.match('man_made', 'flagpole', 'Q664');
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'alternate');    // 'alternate' = matched the `subject:wikidata` tag
      assert.equal(result[0].itemID, 'newzealand-e5dc93');
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'q664');
    });

    await t.test('does not match on man_made/yes', t => {
      const result = _matcher.match('man_made', 'yes', 'new zealand');
      assert.equal(result, null);
    });

    await t.test('does not match on building/yes', t => {
      const result = _matcher.match('building', 'yes', 'new zealand');
      assert.equal(result, null);
    });

    await t.test('matches state flag of Georgia before country flag of Georgia in USA', t => {
      const result = _matcher.match('man_made', 'flagpole', 'georgia', USA);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 2);

      assert.equal(result[0].match, 'primary');            // 'primary' = matched the `flag:name` tag
      assert.equal(result[0].itemID, 'georgia-85bb3f');    // Georgia, the US state
      assert.ok(result[0].area > 21000000);                // usa area ≈ 21817019 km²
      assert.ok(result[0].area < 22000000);
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'georgia');

      assert.equal(result[1].match, 'primary');            // 'primary' = matched the `flag:name` tag
      assert.equal(result[1].itemID, 'georgia-e5dc93');    // Georgia, the country
      assert.ok(result[1].area > 510000000);               // world area ≈ 511207893 km²
      assert.ok(result[1].area < 520000000);
      assert.equal(result[1].kv, 'man_made/flagpole');
      assert.equal(result[1].nsimple, 'georgia');
    });

    await t.test('matches only country flag of Georgia outside the USA', t => {
      const result = _matcher.match('man_made', 'flagpole', 'georgia', HONGKONG);
      assert.ok(result instanceof Array);
      assert.equal(result.length, 1);
      assert.equal(result[0].match, 'primary');            // 'primary' = matched the `flag:name` tag
      assert.equal(result[0].itemID, 'georgia-e5dc93');    // Georgia, the country
      assert.ok(result[0].area > 510000000);               // world area ≈ 511207893 km²
      assert.ok(result[0].area < 520000000);
      assert.equal(result[0].kv, 'man_made/flagpole');
      assert.equal(result[0].nsimple, 'georgia');
    });
  });

});
