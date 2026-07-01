import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERTICALS, CITIES, verticalBySlug, cityBySlug } from '../lib/marketing/geo.js';
import { CATEGORY_MAP } from '../lib/categories.js';

test('every vertical maps to a real category and a source', () => {
  for (const v of VERTICALS) {
    assert.ok(CATEGORY_MAP[v.categoryId], `unknown category ${v.categoryId}`);
    assert.ok(['osm', 'npi'].includes(v.source), `bad source for ${v.slug}`);
    assert.ok(v.slug && v.label && v.unit);
  }
});

test('city slugs are unique and well-formed', () => {
  const slugs = CITIES.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.match(CITIES.find((c) => c.name === 'Austin').slug, /^austin-tx$/);
});

test('lookup helpers resolve and reject', () => {
  assert.equal(verticalBySlug('real-estate').categoryId, 'real_estate');
  assert.equal(verticalBySlug('nope'), null);
  assert.equal(cityBySlug('austin-tx').state, 'TX');
  assert.equal(cityBySlug('nope'), null);
});
