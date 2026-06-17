import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapProvider } from '../lib/sources/npi.js';

test('mapProvider maps an NPI individual to a contact (name + phone, no email)', () => {
  const p = {
    number: 1234567890,
    enumeration_type: 'NPI-1',
    basic: { first_name: 'JANE', last_name: 'DOE', credential: 'LCSW' },
    addresses: [
      { address_purpose: 'MAILING', city: 'OAKLAND', state: 'CA' },
      { address_purpose: 'LOCATION', city: 'LOS ANGELES', state: 'CA', telephone_number: '213-555-0100' },
    ],
    taxonomies: [{ desc: 'Social Worker', primary: true, code: '104100000X' }],
  };
  const c = mapProvider(p, 'discharge_planning');
  assert.equal(c.sourcePlatform, 'npi');
  assert.equal(c.fullName, 'Jane Doe');
  assert.equal(c.firstName, 'Jane');
  assert.equal(c.jobTitle, 'Social Worker · LCSW');
  assert.equal(c.phone, '213-555-0100');     // from the LOCATION address
  assert.equal(c.city, 'Los Angeles');        // title-cased
  assert.equal(c.state, 'CA');
  assert.equal(c.email, null);                // NPI has no emails
  assert.equal(c.profileUrl, 'https://npiregistry.cms.hhs.gov/provider-view/1234567890');
  assert.equal(c.categoryId, 'discharge_planning');
});

test('mapProvider returns null when there is no name', () => {
  assert.equal(mapProvider({ number: 1, basic: {}, addresses: [], taxonomies: [] }, 'discharge_planning'), null);
});
