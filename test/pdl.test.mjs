import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPdlRecord } from '../lib/sources/pdl.js';
import { normalizeChampion, qualify } from '../lib/champion.js';

const record = {
  full_name: 'jane doe',
  job_title: 'Head of Platform',
  job_company_name: 'NewCo',
  job_company_website: 'newco.com',
  job_company_size: '201-500',
  job_title_levels: ['director'],
  job_start_date: '2026-03',
  location_locality: 'austin',
  location_region: 'texas',
  skills: ['kubernetes', 'datadog', 'terraform'],
  emails: [{ address: 'jane@newco.com', type: 'professional' }],
  linkedin_url: 'linkedin.com/in/janedoe',
  twitter_username: 'janedoe',
  experience: [
    { is_primary: true, company: { name: 'NewCo' }, title: { name: 'Head of Platform' }, start_date: '2026-03' },
    { is_primary: false, company: { name: 'OldCo' }, title: { name: 'DevOps Lead' }, start_date: '2022-01', end_date: '2026-02' },
  ],
};

test('mapPdlRecord builds a champion row with HIGH usage from skills', () => {
  const c = mapPdlRecord(record, { targetProduct: 'Datadog' });
  assert.equal(c.person_name, 'Jane Doe');
  assert.equal(c.current_company, 'NewCo');
  assert.equal(c.past_company_where_product_used, 'OldCo'); // most recent non-current
  assert.equal(c.usage_confidence, 'HIGH');                 // datadog in skills
  assert.equal(c.location_state, 'TX');                      // normalized
  assert.equal(c.role_influence, 'decision_maker');          // director level
  assert.equal(c.verified_email, 'jane@newco.com');
  assert.equal(c.new_company_icp_fit, '4');                  // 201-500 bucket
  assert.match(c.linkedin_url, /^https:\/\/www\.linkedin\.com\/in\/janedoe$/);
});

test('mapPdlRecord marks LOW usage when the product is not in skills', () => {
  const c = mapPdlRecord(record, { targetProduct: 'Splunk' });
  assert.equal(c.usage_confidence, 'LOW');
});

test('PDL row flows through the champion engine and qualifies', () => {
  const c = mapPdlRecord(record, { targetProduct: 'Datadog' });
  const q = qualify(normalizeChampion(c), { targetProduct: 'Datadog' });
  // job_start_date 2026-03 is in the past relative to "today" 2026-06 → within window
  assert.equal(q.ok, true);
});

test('mapPdlRecord returns null without a name', () => {
  assert.equal(mapPdlRecord({}, { targetProduct: 'Datadog' }), null);
});
