import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { idgen } from "../lib/idgen.ts";
import type { NsiItem } from "../lib/types.ts";

// Helper to create a typed NsiItem with the given tags
const itemWithTags = (tags: Record<string, string>): NsiItem => ({ tags } as NsiItem);

describe('idgen', () => {
  it('returns a "name-hash" string where hash is 6 hex chars', () => {
    const item = itemWithTags({ name: 'Aldo' });
    const id = idgen(item, 'brands/shop/clothes', 'us');
    assert.ok(id);
    assert.equal(id, 'aldo-5f3bbb');
  });

  it('is deterministic for the same item/tkv/locationID', () => {
    const item = itemWithTags({ name: 'Aldo' });
    const a = idgen(item, 'brands/shop/clothes', 'us');
    const b = idgen(item, 'brands/shop/clothes', 'us');
    assert.equal(a, b);
  });

  it('produces different hashes for different locationIDs', () => {
    const item = itemWithTags({ name: 'Aldo' });
    const a = idgen(item, 'brands/shop/clothes', 'us');
    const b = idgen(item, 'brands/shop/clothes', 'ca');
    assert.notEqual(a, b);
  });

  it('produces different hashes for different tkvs', () => {
    const item = itemWithTags({ name: 'Aldo' });
    const a = idgen(item, 'brands/shop/clothes', 'us');
    const b = idgen(item, 'brands/shop/shoes', 'us');
    assert.notEqual(a, b);
  });


  describe('name selection — brands tree', () => {
    it('prefers `name` over `brand`', () => {
      const item = itemWithTags({ name: 'Aldo', brand: 'Other', operator: 'AnotherOther', network: 'YetAnotherOther' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('falls back to `brand` when `name` is missing', () => {
      const item = itemWithTags({ brand: 'Aldo', operator: 'Other', network: 'AnotherOther' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('falls back to `operator` when name/brand are missing', () => {
      const item = itemWithTags({ operator: 'Aldo', network: 'Other' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('falls back to `network` when name/brand/operator are missing', () => {
      const item = itemWithTags({ network: 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });
  });


  describe('name selection — operators tree', () => {
    it('prefers `operator` over `name`', () => {
      const item = itemWithTags({ name: 'Other', operator: 'Acme' });
      const id = idgen(item, 'operators/amenity/school', 'us');
      assert.ok(id!.startsWith('acme-'));
    });

    it('falls back to `name` when `operator` is missing', () => {
      const item = itemWithTags({ name: 'Acme' });
      const id = idgen(item, 'operators/amenity/school', 'us');
      assert.ok(id!.startsWith('acme-'));
    });
  });


  describe('name selection — transit tree', () => {
    it('prefers `name` over `network` and `operator`', () => {
      const item = itemWithTags({ name: 'Acme', network: 'N', operator: 'O' });
      const id = idgen(item, 'transit/route/bus', 'us');
      assert.ok(id!.startsWith('acme-'));
    });

    it('falls back to `network` when `name` is missing', () => {
      const item = itemWithTags({ network: 'Acme' });
      const id = idgen(item, 'transit/route/bus', 'us');
      assert.ok(id!.startsWith('acme-'));
    });
  });


  describe('name selection — flags tree', () => {
    it('uses `flag:name`', () => {
      const item = itemWithTags({ 'flag:name': 'Stars' });
      const id = idgen(item, 'flags/man_made/flagpole', 'us');
      assert.ok(id!.startsWith('stars-'));
    });

    it('falls back to `subject` when `flag:name` is missing', () => {
      const item = itemWithTags({ subject: 'Stars' });
      const id = idgen(item, 'flags/man_made/flagpole', 'us');
      assert.ok(id!.startsWith('stars-'));
    });

    it('returns null when neither `flag:name` nor `subject` is set', () => {
      const item = itemWithTags({ name: 'ignored' });
      const id = idgen(item, 'flags/man_made/flagpole', 'us');
      assert.equal(id, null);
    });
  });


  describe('regex-keyed tags (language variants)', () => {
    it('matches `name:en`', () => {
      const item = itemWithTags({ 'name:en': 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('matches Latin-script transliteration keys like `name:ja-Latn`', () => {
      const item = itemWithTags({ 'name:ja-Latn': 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('matches 2- and 3-letter language codes like `name:fr`', () => {
      const item = itemWithTags({ 'name:fr': 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });

    it('picks the first clean regex match within a key group', () => {
      // Both keys match `name:[a-z]{2,3}`. Whichever is iterated first that
      // simplifies cleanly should win; both simplify cleanly so we just assert
      // the id corresponds to one of them.
      const item = itemWithTags({ 'name:fr': 'Alpha', 'name:de': 'Beta' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('alpha-') || id!.startsWith('beta-'));
    });

    it('skips regex-matched keys whose simplified value is not /^\\w+$/ and tries the next key group', () => {
      // `name:fr` simplifies to '' (only punctuation), so the loop moves on
      // to `brand`, which simplifies cleanly.
      const item = itemWithTags({ 'name:fr': '...', brand: 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('aldo-'));
    });
  });


  describe('simplification of the name portion', () => {
    it('lowercases and removes spaces', () => {
      const item = itemWithTags({ name: 'Jimmy Choo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('jimmychoo-'));
    });

    it('strips diacritics', () => {
      const item = itemWithTags({ name: 'André' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('andre-'));
    });

    it('replaces & with "and"', () => {
      const item = itemWithTags({ name: 'Johnston & Murphy' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id!.startsWith('johnstonandmurphy-'));
    });
  });


  describe('hash fallback for non-/^\\w+$/ names', () => {
    it('falls back to a 6-char md5 hex when no key yields a clean name', () => {
      // After simplification, '!!!' becomes '' which is not `/^\w+$/`.
      // No clean name exists, so the function should hash the first
      // simplified value it can find.
      const item = itemWithTags({ name: '!!!' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id);
      assert.equal(id, 'd41d8c-5f3bbb');
    });

    it('hashes a regex-matched key value when no clean name is found', () => {
      const item = itemWithTags({ 'name:fr': '!!!' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.ok(id);
      assert.equal(id, 'd41d8c-5f3bbb');
    });
  });


  describe('null returns', () => {
    it('returns null when the item has no usable tags', () => {
      const item = itemWithTags({});
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.equal(id, null);
    });

    it('returns null when the item has only tags outside the tree\'s key list', () => {
      const item = itemWithTags({ subject: 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', 'us');
      assert.equal(id, null);
    });

    it('returns null when locationID is empty', () => {
      const item = itemWithTags({ name: 'Aldo' });
      const id = idgen(item, 'brands/shop/clothes', '');
      assert.equal(id, null);
    });

    it('returns null when tkv is empty', () => {
      const item = itemWithTags({ name: 'Aldo' });
      const id = idgen(item, '', 'us');
      assert.equal(id, null);
    });
  });
});
