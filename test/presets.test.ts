import { describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { buildIDPresets, buildJOSMPresets } from '../src/nsi.ts';
import * as sample from './matcher.sample.ts';


// Minimal stand-in for the `@openstreetmap/id-tagging-schema` presets dictionary.
const sourcePresets = {
  'amenity': {
    name: 'Amenity',
    icon: 'maki-marker',
    geometry: ['point', 'area'],
    tags: { amenity: '*' }
  },
  'amenity/post_office': {
    name: 'Post Office',
    icon: 'maki-post',
    geometry: ['point', 'area'],
    tags: { amenity: 'post_office' }
  },
  'amenity/fast_food': {
    name: 'Fast Food',
    icon: 'maki-fast-food',
    geometry: ['point', 'area'],
    tags: { amenity: 'fast_food' }
  }
};


describe('buildIDPresets', () => {
  it('returns presets keyed by <presetID>/<itemID>', () => {
    const result = buildIDPresets(sample.data, { sourcePresets });
    assert.ok(result.presets['amenity/post_office/theupsstore-d4e3fc']);
    assert.ok(result.presets['amenity/post_office/unitedstatespostalservice-b9aa24']);
    assert.ok(result.presets['amenity/fast_food/honeybakedham-4d2ff4']);
  });

  it('populates name, icon, geometry, locationSet, and matchScore', () => {
    const result = buildIDPresets(sample.data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.name, 'The UPS Store');
    assert.equal(preset.icon, 'maki-post');
    assert.deepEqual(preset.geometry, ['point', 'area']);
    assert.deepEqual(preset.locationSet, { include: ['ca', 'us'] });
    assert.equal(preset.matchScore, 2);
  });

  it('adds the *:wikidata tag to `tags` and carries through source tags', () => {
    const result = buildIDPresets(sample.data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.tags['brand:wikidata'], 'Q7771029');
    assert.equal(preset.tags.amenity, 'post_office');
  });

  it('collects lowercased brand/short_name values into `terms`', () => {
    const result = buildIDPresets(sample.data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.ok(preset.terms);
    assert.ok(preset.terms.includes('the ups store'));
    assert.ok(preset.terms.includes('ups'));
  });

  it('includes matchNames in `terms`', () => {
    const result = buildIDPresets(sample.data, { sourcePresets });
    const preset = result.presets['amenity/fast_food/honeybakedham-4d2ff4'];
    assert.ok(preset.terms);
    assert.ok(preset.terms.includes('honey baked ham company'));
  });

  it('marks dissolved items as not searchable', () => {
    const dissolved = { 'theupsstore-d4e3fc': [{ date: '2099-01-01' }] };
    const result = buildIDPresets(sample.data, { sourcePresets, dissolved });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.searchable, false);
  });

  it('assigns imageURL from wikidata logos when available', () => {
    const wikidata = {
      Q7771029: { logos: { facebook: 'https://fb/ups.png' } }
    };
    const result = buildIDPresets(sample.data, { sourcePresets, wikidata });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.imageURL, 'https://fb/ups.png');
  });

  it('prefers commons logo over facebook for special QIDs (e.g. McDonald\'s Q38076)', () => {
    // Construct a minimal dataset hitting the preferCommons list.
    const mcdata = {
      'brands/amenity/fast_food': {
        properties: { path: 'brands/amenity/fast_food', exclude: {} },
        items: [{
          id: 'mcdonalds-abc123',
          displayName: "McDonald's",
          locationSet: { include: ['001'] },
          tags: {
            amenity: 'fast_food',
            brand: "McDonald's",
            'brand:wikidata': 'Q38076'
          }
        }]
      }
    };
    const wikidata = {
      Q38076: { logos: { wikidata: 'https://commons/mcd.svg', facebook: 'https://fb/mcd.png' } }
    };
    const result = buildIDPresets(mcdata, { sourcePresets, wikidata });
    const preset = result.presets['amenity/fast_food/mcdonalds-abc123'];
    assert.equal(preset.imageURL, 'https://commons/mcd.svg');
  });

  it('reports missing source preset paths', () => {
    const noFastFood = { 'amenity': sourcePresets.amenity, 'amenity/post_office': sourcePresets['amenity/post_office'] };
    const result = buildIDPresets(sample.data, { sourcePresets: noFastFood });
    assert.ok(result.missing.includes('brands/amenity/fast_food'));
  });

  it('skips items missing a valid wikidata QID', () => {
    const bad = {
      'brands/amenity/post_office': {
        properties: { path: 'brands/amenity/post_office', exclude: {} },
        items: [{
          id: 'noqid-000000',
          displayName: 'NoQID',
          locationSet: { include: ['001'] },
          tags: { amenity: 'post_office', brand: 'NoQID' }   // no brand:wikidata
        }]
      }
    };
    const result = buildIDPresets(bad, { sourcePresets });
    assert.equal(Object.keys(result.presets).length, 0);
  });

  it('does not mutate the input data', () => {
    const snapshot = JSON.stringify(sample.data);
    buildIDPresets(sample.data, { sourcePresets });
    assert.equal(JSON.stringify(sample.data), snapshot);
  });

  it('chooses the most specific child preset when multiple match', () => {
    // Source presets where `amenity/fast_food/chicken` is more specific than `amenity/fast_food`.
    const presets = {
      ...sourcePresets,
      'amenity/fast_food/chicken': {
        name: 'Chicken Fast Food',
        icon: 'temaki-chicken',
        geometry: ['point', 'area'],
        tags: { amenity: 'fast_food', cuisine: 'chicken' }
      }
    };
    const result = buildIDPresets(sample.data, { sourcePresets: presets });
    // KFC has `cuisine=chicken`, so it should land under the more specific preset.
    assert.ok(result.presets['amenity/fast_food/chicken/kfc-658eea']);
    assert.equal(result.presets['amenity/fast_food/chicken/kfc-658eea'].icon, 'temaki-chicken');
    // Honey Baked Ham (cuisine=american) stays under the generic fast_food preset.
    assert.ok(result.presets['amenity/fast_food/honeybakedham-4d2ff4']);
  });

  it('handles semicolon-separated multi-value tags (e.g. cuisine)', () => {
    const presets = {
      ...sourcePresets,
      'amenity/fast_food/burger': {
        name: 'Burger Fast Food', icon: 'maki-burger', geometry: ['point', 'area'],
        tags: { amenity: 'fast_food', cuisine: 'burger' }
      },
      'amenity/fast_food/chicken': {
        name: 'Chicken Fast Food', icon: 'temaki-chicken', geometry: ['point', 'area'],
        tags: { amenity: 'fast_food', cuisine: 'chicken' }
      }
    };
    const multiCuisine = {
      'brands/amenity/fast_food': {
        properties: { path: 'brands/amenity/fast_food', exclude: {} },
        items: [{
          id: 'comboshop-aaa111',
          displayName: 'Combo Shop',
          locationSet: { include: ['001'] },
          tags: {
            amenity: 'fast_food',
            brand: 'Combo Shop',
            'brand:wikidata': 'Q9999999',
            cuisine: 'burger;chicken'  // burger first → higher rating
          }
        }]
      }
    };
    const result = buildIDPresets(multiCuisine, { sourcePresets: presets });
    assert.ok(result.presets['amenity/fast_food/burger/comboshop-aaa111']);
    assert.ok(!result.presets['amenity/fast_food/chicken/comboshop-aaa111']);
  });

  it('falls back to a generic key preset when no key/value preset is found', () => {
    // Include only the bare `amenity` preset → all items fall back to it.
    const result = buildIDPresets(sample.data, { sourcePresets: { amenity: sourcePresets.amenity } });
    assert.ok(result.presets['amenity/theupsstore-d4e3fc']);
    assert.ok(result.missing.includes('brands/amenity/post_office'));
    assert.ok(result.missing.includes('brands/amenity/fast_food'));
  });

  it('skips items entirely when no source preset matches at all', () => {
    const result = buildIDPresets(sample.data, { sourcePresets: {} });
    assert.equal(Object.keys(result.presets).length, 0);
  });

  it('applies presetPathOverrides (e.g. amenity/college → education/college)', () => {
    const collegeData = {
      'brands/amenity/college': {
        properties: { path: 'brands/amenity/college', exclude: {} },
        items: [{
          id: 'someuni-111111',
          displayName: 'Some College',
          locationSet: { include: ['001'] },
          tags: { amenity: 'college', brand: 'Some College', 'brand:wikidata': 'Q1234567' }
        }]
      }
    };
    const presets = {
      'education/college': {
        name: 'College', icon: 'maki-college', geometry: ['point', 'area'],
        tags: { amenity: 'college' }
      }
    };
    const result = buildIDPresets(collegeData, { sourcePresets: presets });
    assert.ok(result.presets['education/college/someuni-111111']);
  });

  it('generates Route Relation presets under type/route/* for k=route', () => {
    const routeData = {
      'transit/route/bus': {
        properties: { path: 'transit/route/bus', exclude: {} },
        items: [{
          id: 'busline-222222',
          displayName: 'Bus Line',
          locationSet: { include: ['001'] },
          tags: { type: 'route', route: 'bus', network: 'BL', 'network:wikidata': 'Q2222222' }
        }]
      }
    };
    const presets = {
      'type/route/bus': {
        name: 'Bus Route', icon: 'maki-bus', geometry: ['line'],
        tags: { type: 'route', route: 'bus' }
      }
    };
    const result = buildIDPresets(routeData, { sourcePresets: presets });
    assert.ok(result.presets['type/route/bus/busline-222222']);
  });

  it('generates both type/route/ferry and route/ferry presets for transit/route/ferry', () => {
    const ferryData = {
      'transit/route/ferry': {
        properties: { path: 'transit/route/ferry', exclude: {} },
        items: [{
          id: 'ferryco-333333',
          displayName: 'Ferry Co',
          locationSet: { include: ['001'] },
          tags: { type: 'route', route: 'ferry', network: 'FC', 'network:wikidata': 'Q3333333' }
        }]
      }
    };
    const presets = {
      'type/route/ferry': {
        name: 'Ferry Route', icon: 'maki-ferry', geometry: ['line'],
        tags: { type: 'route', route: 'ferry' }
      },
      'route/ferry': {
        name: 'Ferry Way', icon: 'maki-ferry', geometry: ['line'],
        tags: { route: 'ferry' }
      }
    };
    const result = buildIDPresets(ferryData, { sourcePresets: presets });
    assert.ok(result.presets['type/route/ferry/ferryco-333333']);
    assert.ok(result.presets['route/ferry/ferryco-333333']);
  });

  it('adds name+brand fields when brands preserve the ^name tag', () => {
    const preserved = {
      'brands/amenity/post_office': {
        properties: { path: 'brands/amenity/post_office', exclude: {}, preserveTags: ['^name'] },
        items: [{
          id: 'localpost-444444',
          displayName: 'Local Post',
          locationSet: { include: ['001'] },
          tags: { amenity: 'post_office', brand: 'Local Post', 'brand:wikidata': 'Q4444444' }
        }]
      }
    };
    const result = buildIDPresets(preserved, { sourcePresets });
    const preset = result.presets['amenity/post_office/localpost-444444'];
    assert.deepEqual(preset.fields, ['name', 'brand', '{amenity/post_office}']);
    assert.deepEqual(preset.preserveTags, ['^name']);
  });

  it('adds name+operator fields when operators preserve the ^name tag (item-level)', () => {
    const preserved = {
      'operators/amenity/post_office': {
        properties: { path: 'operators/amenity/post_office', exclude: {} },
        items: [{
          id: 'localop-555555',
          displayName: 'Local Op',
          locationSet: { include: ['001'] },
          preserveTags: ['^name'],
          tags: { amenity: 'post_office', operator: 'Local Op', 'operator:wikidata': 'Q5555555' }
        }]
      }
    };
    const result = buildIDPresets(preserved, { sourcePresets });
    const preset = result.presets['amenity/post_office/localop-555555'];
    assert.deepEqual(preset.fields, ['name', 'operator', '{amenity/post_office}']);
  });

  it('falls back to wikidata logo when no facebook logo is present', () => {
    const wikidata = {
      Q7771029: { logos: { wikidata: 'https://commons/ups.svg' } }
    };
    const result = buildIDPresets(sample.data, { sourcePresets, wikidata });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.imageURL, 'https://commons/ups.svg');
  });

  it('omits imageURL when wikidata has no logos at all', () => {
    const wikidata = { Q7771029: {} };
    const result = buildIDPresets(sample.data, { sourcePresets, wikidata });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.imageURL, undefined);
  });
});


describe('buildJOSMPresets', () => {
  it('returns an XMLBuilder document that can be serialized', () => {
    const root = buildJOSMPresets(sample.data, { version: '1.2.3', description: 'test' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('<presets'));
    assert.ok(xml.includes('version="1.2.3"'));
    assert.ok(xml.includes('description="test"'));
    assert.ok(xml.includes('name="Name Suggestion Index"'));
  });

  it('organises items under tree/key/value groups', () => {
    const root = buildJOSMPresets(sample.data, { version: '1', description: 'd' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('name="brands"'));
    assert.ok(xml.includes('name="amenity"'));
    assert.ok(xml.includes('name="post_office"'));
    assert.ok(xml.includes('name="The UPS Store"'));
    assert.ok(xml.includes('name="United States Postal Service"'));
  });

  it('emits key/value tag pairs as nested <key> elements', () => {
    const root = buildJOSMPresets(sample.data, { version: '1', description: 'd' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('key="brand:wikidata"'));
    assert.ok(xml.includes('value="Q7771029"'));
  });

  it('excludes dissolved items', () => {
    const dissolved = { 'theupsstore-d4e3fc': [{ date: '2099-01-01' }] };
    const root = buildJOSMPresets(sample.data, { version: '1', description: 'd', dissolved });
    const xml = root.end();
    assert.ok(!xml.includes('The UPS Store'));
    assert.ok(xml.includes('United States Postal Service'));   // others still present
  });

  it('excludes items missing a valid wikidata QID', () => {
    const bad = {
      'brands/amenity/post_office': {
        properties: { path: 'brands/amenity/post_office', exclude: {} },
        items: [{
          id: 'noqid-000000',
          displayName: 'NoQID Brand',
          locationSet: { include: ['001'] },
          tags: { amenity: 'post_office', brand: 'NoQID Brand' }
        }]
      }
    };
    const root = buildJOSMPresets(bad, { version: '1', description: 'd' });
    const xml = root.end();
    assert.ok(!xml.includes('NoQID Brand'));
  });

  it('gives ferry routes type="way,closedway,relation"', () => {
    const ferry = {
      'transit/route/ferry': {
        properties: { path: 'transit/route/ferry', exclude: {} },
        items: [{
          id: 'acme_ferry-aabbcc',
          displayName: 'Acme Ferry',
          locationSet: { include: ['001'] },
          tags: { route: 'ferry', network: 'Acme Ferry', 'network:wikidata': 'Q1' }
        }]
      }
    };
    const root = buildJOSMPresets(ferry, { version: '1', description: 'd' });
    const xml = root.end();
    assert.ok(xml.includes('type="way,closedway,relation"'));
  });

  it('gives power line items type="way,closedway"', () => {
    const power = {
      'operators/power/line': {
        properties: { path: 'operators/power/line', exclude: {} },
        items: [{
          id: 'acme_power-aabbcc',
          displayName: 'Acme Power',
          locationSet: { include: ['001'] },
          tags: { power: 'line', operator: 'Acme Power', 'operator:wikidata': 'Q2' }
        }]
      }
    };
    const root = buildJOSMPresets(power, { version: '1', description: 'd' });
    const xml = root.end();
    assert.ok(xml.includes('type="way,closedway"'));
  });

  it('gives power pole/tower items type="node"', () => {
    const power = {
      'operators/power/pole': {
        properties: { path: 'operators/power/pole', exclude: {} },
        items: [{
          id: 'acme_power-aabbcc',
          displayName: 'Acme Power',
          locationSet: { include: ['001'] },
          tags: { power: 'pole', operator: 'Acme Power', 'operator:wikidata': 'Q2' }
        }]
      }
    };
    const root = buildJOSMPresets(power, { version: '1', description: 'd' });
    const xml = root.end();
    assert.ok(xml.includes('type="node"'));
  });

  it('does not mutate the input data', () => {
    const snapshot = JSON.stringify(sample.data);
    buildJOSMPresets(sample.data, { version: '1', description: 'd' });
    assert.equal(JSON.stringify(sample.data), snapshot);
  });
});
