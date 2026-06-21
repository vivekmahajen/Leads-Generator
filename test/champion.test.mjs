import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChampion, qualify, score, monthsBetween, processChampions } from '../lib/champion.js';

const recentDate = () => {
  const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString().slice(0, 10);
};

const johnDoe = {
  person_name: 'John Doe', current_title: 'Head of Platform', current_company: 'NewCo',
  current_company_domain: 'newco.com', location_city: 'Austin', location_state: 'TX',
  past_company_where_product_used: 'OldCo', target_product: 'Datadog',
  usage_confidence: 'HIGH', usage_evidence: 'Listed Datadog under skills :: https://li/x',
  job_change_date: recentDate(), role_influence: 'decision_maker', new_company_icp_fit: '5',
  new_company_is_existing_customer: 'no', verified_email: 'john@newco.com', email_confidence: 'high',
  email_source: 'Hunter.io', linkedin_url: 'https://li/john', x_handle: '@john',
};

test('monthsBetween handles valid/invalid/future dates', () => {
  assert.equal(monthsBetween('1900-01-01') > 12, true);
  assert.equal(monthsBetween('not-a-date'), null);
  const future = new Date(); future.setMonth(future.getMonth() + 3);
  assert.equal(monthsBetween(future.toISOString()), null);
});

test('normalize parses evidence + fields', () => {
  const c = normalizeChampion(johnDoe);
  assert.equal(c.usage_confidence, 'HIGH');
  assert.equal(c.role_influence, 'decision_maker');
  assert.equal(c.new_company_icp_fit, 5);
  assert.equal(c.usage_evidence[0].source_url, 'https://li/x');
  assert.ok(c.months_in_new_role <= 3);
});

test('qualify: keep a strong recent champion', () => {
  assert.equal(qualify(normalizeChampion(johnDoe), {}).ok, true);
});

test('qualify: drop LOW usage, stale change, and existing customers', () => {
  assert.match(qualify(normalizeChampion({ ...johnDoe, usage_confidence: 'LOW' }), {}).reason, /HIGH\/MEDIUM/);
  assert.match(qualify(normalizeChampion({ ...johnDoe, job_change_date: '2018-01-01' }), {}).reason, /> 12mo/);
  assert.match(qualify(normalizeChampion({ ...johnDoe, new_company_is_existing_customer: 'yes' }), {}).reason, /already a customer/);
});

test('qualify: respects target product + geo filters', () => {
  assert.equal(qualify(normalizeChampion(johnDoe), { targetProduct: 'Datadog' }).ok, true);
  assert.match(qualify(normalizeChampion(johnDoe), { targetProduct: 'Splunk' }).reason, /different product/);
  assert.match(qualify(normalizeChampion(johnDoe), { geo: { state: 'CA' } }).reason, /outside geography/);
});

test('score: HIGH + 0-3mo + DM + icp5 + verified email tops out high', () => {
  const s = score(normalizeChampion(johnDoe));
  // 35 (HIGH) + 20 (<=3mo) + 20 (DM) + 15 (icp 5/5) + 10 (verified email) = 100
  assert.equal(s, 100);
});

test('processChampions ranks, dedups, and summarizes', () => {
  const weaker = { ...johnDoe, person_name: 'Jane Roe', verified_email: 'jane@newco.com', linkedin_url: 'https://li/jane', usage_confidence: 'MEDIUM', role_influence: 'influencer', new_company_icp_fit: '3' };
  const dupe = { ...johnDoe }; // same identity as johnDoe
  const stale = { ...johnDoe, person_name: 'Old Tim', verified_email: 'tim@x.com', linkedin_url: '', job_change_date: '2019-01-01' };
  const { leads, quarantined, summary } = processChampions([johnDoe, weaker, dupe, stale], {});
  assert.equal(leads.length, 2);
  assert.equal(leads[0].person_name, 'John Doe'); // higher score first
  assert.ok(quarantined.some((q) => q.reason === 'duplicate person'));
  assert.ok(quarantined.some((q) => /12mo/.test(q.reason)));
  assert.equal(summary.qualified_leads, 2);
  assert.equal(summary.multi_hire_companies[0].company, 'newco');
});
