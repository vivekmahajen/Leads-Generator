import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, elementToContact, normalizeState } from '../lib/sources/osm.js';

test('normalizeState maps names/codes to a 2-letter code', () => {
  assert.equal(normalizeState('California'), 'CA');
  assert.equal(normalizeState('new york'), 'NY');
  assert.equal(normalizeState('tx'), 'TX');
  assert.equal(normalizeState('CA'), 'CA');
  assert.equal(normalizeState(null), null);
  assert.equal(normalizeState('Ontario'), 'Ontario'); // unknown → passthrough
});

test('buildQuery emits tag + keyword selectors within the bbox', () => {
  const q = buildQuery({ south: 1, west: 2, north: 3, east: 4 }, 'real_estate', 50);
  assert.match(q, /\[out:json\]/);
  assert.match(q, /nwr\["office"="estate_agent"\]\["name"\]\(1,2,3,4\);/);
  assert.match(q, /out center 50;/);
});

test('buildQuery falls back to office=company for unknown categories', () => {
  const q = buildQuery({ south: 0, west: 0, north: 1, east: 1 }, 'totally_unknown', 10);
  assert.match(q, /nwr\["office"="company"\]/);
});

test('elementToContact maps OSM tags to a contact (real fields)', () => {
  const el = {
    type: 'node', id: 123,
    tags: {
      name: 'Northwind Solar',
      'contact:phone': '+1 415 555 0101',
      website: 'https://northwindsolar.com',
      'contact:email': 'hello@northwindsolar.com',
      'addr:city': 'San Diego', 'addr:state': 'CA',
    },
  };
  const c = elementToContact(el, 'solar_energy');
  assert.equal(c.sourcePlatform, 'osm');
  assert.equal(c.companyName, 'Northwind Solar');
  assert.equal(c.firstName, 'Northwind Solar');
  assert.equal(c.phone, '+1 415 555 0101');
  assert.equal(c.email, 'hello@northwindsolar.com');
  assert.equal(c.emailSource, 'directory');
  assert.equal(c.companyDomain, 'northwindsolar.com');
  assert.equal(c.profileUrl, 'https://northwindsolar.com');
  assert.equal(c.city, 'San Diego');
  assert.equal(c.categoryId, 'solar_energy');
});

test('elementToContact uses the OSM url when no website, and skips unnamed', () => {
  const noWeb = elementToContact({ type: 'way', id: 9, tags: { name: 'Acme Realty' } }, 'real_estate');
  assert.equal(noWeb.profileUrl, 'https://www.openstreetmap.org/way/9');
  assert.equal(noWeb.companyDomain, null);
  assert.equal(elementToContact({ type: 'node', id: 1, tags: {} }, 'real_estate'), null);
});
