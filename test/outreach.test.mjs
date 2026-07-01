import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, withComplianceFooter } from '../lib/outreach/render.js';
import { makeUnsubToken, verifyUnsubToken } from '../lib/outreach/token.js';
import { regionOf, isRestrictedRegion, enrollableEmail } from '../lib/outreach/policy.js';

test('renderTemplate fills merge fields', () => {
  const lead = { firstName: 'Dana', companyName: 'Northwind', city: 'Austin' };
  assert.equal(renderTemplate('Hi {{firstName}} at {{company}} in {{city}}', lead), 'Hi Dana at Northwind in Austin');
});

test('renderTemplate never leaves a raw token — uses fallbacks', () => {
  const out = renderTemplate('Hi {{firstName}} at {{company}}', {});
  assert.doesNotMatch(out, /\{\{/);
  assert.equal(out, 'Hi there at your team');
});

test('withComplianceFooter appends unsubscribe + address', () => {
  const body = withComplianceFooter('Body', { fromName: 'Jane', footerAddress: '1 Main St, TX', unsubscribeUrl: 'https://x/u?token=abc' });
  assert.match(body, /Unsubscribe: https:\/\/x\/u\?token=abc/);
  assert.match(body, /1 Main St, TX/);
});

test('unsubscribe token round-trips and rejects tampering', () => {
  const t = makeUnsubToken('user-1', 'Foo@Bar.com');
  const d = verifyUnsubToken(t);
  assert.equal(d.userId, 'user-1');
  assert.equal(d.email, 'foo@bar.com'); // lowercased
  assert.equal(verifyUnsubToken(t + 'x'), null);
  assert.equal(verifyUnsubToken('garbage'), null);
  assert.equal(verifyUnsubToken(null), null);
});

test('region policy: US ok, EU/India restricted', () => {
  assert.equal(regionOf({ country: null }), 'US');
  assert.equal(isRestrictedRegion({ country: 'US' }), false);
  assert.equal(isRestrictedRegion({ country: 'DE' }), true);
  assert.equal(isRestrictedRegion({ country: 'IN' }), true);
});

test('enrollableEmail rejects missing + guessed emails', () => {
  assert.equal(enrollableEmail({ email: 'a@b.com', source: 'directory' }).ok, true);
  assert.equal(enrollableEmail({ email: null }).ok, false);
  assert.match(enrollableEmail({ email: 'info@b.com', source: 'guess' }).reason, /guessed/);
});
