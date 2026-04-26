import { describe, it } from 'bun:test';
import { strict as assert } from 'bun:assert';
import { buildIDPresets, buildJOSMPresets } from '../src/nsi.ts';

const data = await Bun.file('./test/matcher.data.json').json();

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
    const result = buildIDPresets(data, { sourcePresets });
    assert.ok(result.presets['amenity/post_office/theupsstore-d4e3fc']);
    assert.ok(result.presets['amenity/post_office/unitedstatespostalservice-b9aa24']);
    assert.ok(result.presets['amenity/fast_food/honeybakedham-4d2ff4']);
  });

  it('populates name, icon, geometry, locationSet, and matchScore', () => {
    const result = buildIDPresets(data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.name, 'The UPS Store');
    assert.equal(preset.icon, 'maki-post');
    assert.deepEqual(preset.geometry, ['point', 'area']);
    assert.deepEqual(preset.locationSet, { include: ['ca', 'us'] });
    assert.equal(preset.matchScore, 2);
  });

  it('adds the *:wikidata tag to `tags` and carries through source tags', () => {
    const result = buildIDPresets(data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.tags['brand:wikidata'], 'Q7771029');
    assert.equal(preset.tags.amenity, 'post_office');
  });

  it('collects lowercased brand/short_name values into `terms`', () => {
    const result = buildIDPresets(data, { sourcePresets });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.ok(preset.terms);
    assert.ok(preset.terms.includes('the ups store'));
    assert.ok(preset.terms.includes('ups'));
  });

  it('includes matchNames in `terms`', () => {
    const result = buildIDPresets(data, { sourcePresets });
    const preset = result.presets['amenity/fast_food/honeybakedham-4d2ff4'];
    assert.ok(preset.terms.includes('honey baked ham company'));
  });

  it('marks dissolved items as not searchable', () => {
    const dissolved = { 'theupsstore-d4e3fc': [{ date: '2099-01-01' }] };
    const result = buildIDPresets(data, { sourcePresets, dissolved });
    const preset = result.presets['amenity/post_office/theupsstore-d4e3fc'];
    assert.equal(preset.searchable, false);
  });

  it('assigns imageURL from wikidata logos when available', () => {
    const wikidata = {
      Q7771029: { logos: { facebook: 'https://fb/ups.png' } }
    };
    const result = buildIDPresets(data, { sourcePresets, wikidata });
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
    const result = buildIDPresets(data, { sourcePresets: noFastFood });
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
    const snapshot = JSON.stringify(data);
    buildIDPresets(data, { sourcePresets });
    assert.equal(JSON.stringify(data), snapshot);
  });
});


describe('buildJOSMPresets', () => {
  it('returns an XMLBuilder document that can be serialized', () => {
    const root = buildJOSMPresets(data, { version: '1.2.3', description: 'test' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('<presets'));
    assert.ok(xml.includes('version="1.2.3"'));
    assert.ok(xml.includes('description="test"'));
    assert.ok(xml.includes('name="Name Suggestion Index"'));
  });

  it('organises items under tree/key/value groups', () => {
    const root = buildJOSMPresets(data, { version: '1', description: 'd' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('name="brands"'));
    assert.ok(xml.includes('name="amenity"'));
    assert.ok(xml.includes('name="post_office"'));
    assert.ok(xml.includes('name="The UPS Store"'));
    assert.ok(xml.includes('name="United States Postal Service"'));
  });

  it('emits key/value tag pairs as nested <key> elements', () => {
    const root = buildJOSMPresets(data, { version: '1', description: 'd' });
    const xml = root.end({ prettyPrint: true });
    assert.ok(xml.includes('key="brand:wikidata"'));
    assert.ok(xml.includes('value="Q7771029"'));
  });

  it('excludes dissolved items', () => {
    const dissolved = { 'theupsstore-d4e3fc': [{ date: '2099-01-01' }] };
    const root = buildJOSMPresets(data, { version: '1', description: 'd', dissolved });
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

  it('does not mutate the input data', () => {
    const snapshot = JSON.stringify(data);
    buildJOSMPresets(data, { version: '1', description: 'd' });
    assert.equal(JSON.stringify(data), snapshot);
  });
});
