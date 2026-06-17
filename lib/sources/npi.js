// lib/sources/npi.js
// FREE named healthcare contacts from the CMS NPI Registry (no API key).
// https://npiregistry.cms.hhs.gov/api/ — public US provider directory.
//
// For discharge planning we pull INDIVIDUAL providers (NPI-1) whose taxonomy is
// Social Worker or Case Manager/Care Coordinator, by state (+ optional city).
// The NPI Registry gives real names + practice phone + city/state — but it has
// NO email addresses (no free source does for these roles).

const NPI_API = 'https://npiregistry.cms.hhs.gov/api/';

// Taxonomy descriptions relevant to discharge planning (prefix-matched with *).
const TAXONOMIES = ['Social Worker*', 'Case Manage*'];

const titleCase = (s) =>
  s ? s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()).trim() : s;

export function mapProvider(p, categoryId) {
  const b = p.basic || {};
  const first = b.first_name ? titleCase(b.first_name) : null;
  const last = b.last_name ? titleCase(b.last_name) : null;
  if (!first && !last) return null;

  const addrs = p.addresses || [];
  const loc = addrs.find((a) => a.address_purpose === 'LOCATION') || addrs[0] || {};
  const taxes = p.taxonomies || [];
  const tax = taxes.find((t) => t.primary) || taxes[0] || {};

  return {
    sourcePlatform: 'npi',
    sourceType: 'discharge_planning',
    firstName: first,
    lastName: last,
    fullName: [first, last].filter(Boolean).join(' '),
    jobTitle: [tax.desc, b.credential].filter(Boolean).join(' · ') || 'Healthcare provider',
    companyName: b.organization_name || null,
    companyDomain: null,
    phone: loc.telephone_number || null,
    email: null, // NPI has no emails
    emailSource: null,
    city: loc.city ? titleCase(loc.city) : null,
    state: loc.state || null,
    country: 'US',
    username: String(p.number),
    profileUrl: `https://npiregistry.cms.hhs.gov/provider-view/${p.number}`,
    categoryId,
  };
}

/** Find individual discharge-planning providers by state (+ optional city). */
export async function findNpiProviders({ state, city, categoryId, limit = 100 }) {
  if (!state) {
    const e = new Error('A state is required for an NPI search (e.g. "Los Angeles, CA").');
    e.status = 400;
    throw e;
  }
  const seen = new Map();
  for (const tax of TAXONOMIES) {
    const params = new URLSearchParams({
      version: '2.1',
      enumeration_type: 'NPI-1',
      taxonomy_description: tax,
      state,
      limit: String(Math.min(Math.max(limit, 1), 200)),
    });
    if (city) params.set('city', city);

    const res = await fetch(`${NPI_API}?${params}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const e = new Error(`NPI lookup failed (${res.status}). Try again shortly.`);
      e.status = 502;
      throw e;
    }
    const data = await res.json();
    for (const p of data.results || []) {
      const c = mapProvider(p, categoryId);
      if (c) seen.set(c.username, c);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return { contacts: [...seen.values()], found: seen.size };
}
