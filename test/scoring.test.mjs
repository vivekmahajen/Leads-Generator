import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreContact, getScoreLabel } from '../lib/scoring.js';
import { detectCategory } from '../lib/categories.js';

test('platform/source base scores apply', () => {
  const li = scoreContact({}, 'linkedin', 'people_search'); // base 45
  const tw = scoreContact({}, 'twitter', 'intent_search');  // base 70
  assert.ok(tw > li);
  assert.ok(li >= 45);
});

test('hot keywords raise the score', () => {
  const cold = scoreContact({ headline: 'marketing manager' }, 'twitter', 'intent_search');
  const hot = scoreContact({ headline: 'looking for a CRM, any recommendations' }, 'twitter', 'intent_search');
  assert.ok(hot > cold);
});

test('recency bonus applies for fresh contacts', () => {
  const fresh = scoreContact({ scrapedAt: new Date().toISOString() }, 'linkedin', 'people_search');
  const old = scoreContact({ scrapedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() }, 'linkedin', 'people_search');
  assert.ok(fresh > old);
});

test('score is capped at 100 and floored at 0', () => {
  const maxed = scoreContact(
    { headline: 'looking for need a recommend seeking want to buy interested in', email: 'x@y.com', companyName: 'C', jobTitle: 'T', city: 'NY', scrapedAt: new Date().toISOString() },
    'twitter', 'intent_search',
  );
  assert.ok(maxed <= 100);
  assert.ok(scoreContact({}, 'unknown', 'unknown') >= 0);
});

test('score labels map correctly', () => {
  assert.equal(getScoreLabel(90).label, 'Hot');
  assert.equal(getScoreLabel(65).label, 'Warm');
  assert.equal(getScoreLabel(45).label, 'Cold');
  assert.equal(getScoreLabel(10).label, 'Low');
});

test('detectCategory picks the best keyword match', () => {
  assert.equal(detectCategory('Founder at a rooftop solar installation company'), 'solar_energy');
  assert.equal(detectCategory('Managing broker, real estate & property'), 'real_estate');
  assert.equal(detectCategory('looking for lunch'), null);
});
