// lib/sources/pdl.js
// Compliant paid data-API connector: People Data Labs Person Search. Returns
// enriched people (employment history, skills, location, email) in one call —
// enough to build champion rows automatically. Requires PDL_API_KEY.
//
// PDL licenses B2B data; this is the arms-length, ToS-respecting alternative to
// scraping LinkedIn.

import { normalizeState } from './osm.js';

const PDL_SEARCH = 'https://api.peopledatalabs.com/v5/person/search';

const titleCase = (s) => (s ? s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()).trim() : s);

function roleInfluence(levels = []) {
  const l = levels.map((x) => String(x).toLowerCase());
  if (l.some((x) => ['cxo', 'owner', 'partner', 'vp', 'director'].includes(x))) return 'decision_maker';
  if (l.some((x) => ['manager', 'head', 'senior'].includes(x))) return 'influencer';
  return 'user';
}

function icpFromSize(size) {
  const s = String(size || '');
  if (/(5001|10001|10000\+|5001-10000)/.test(s)) return 5;
  if (/(1001|501|201)/.test(s)) return 4;
  if (/(51|11)/.test(s)) return 3;
  return 2;
}

// Map a PDL person record → a champion row (field names match the CSV schema,
// so it flows straight into the champion engine).
export function mapPdlRecord(r, { targetProduct }) {
  if (!r || !r.full_name) return null;
  const exp = Array.isArray(r.experience) ? r.experience : [];
  const currentCo = (r.job_company_name || '').toLowerCase();
  const prior = exp
    .filter((e) => e.company?.name && e.company.name.toLowerCase() !== currentCo)
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));
  const pastCompany = prior[0]?.company?.name || null;

  const skills = (r.skills || []).map((s) => String(s).toLowerCase());
  const prod = (targetProduct || '').toLowerCase();
  const usesProduct = prod && skills.includes(prod);

  const email = (r.emails || []).map((e) => e.address).find(Boolean) || r.work_email || null;

  return {
    person_name: titleCase(r.full_name),
    current_title: r.job_title || null,
    current_company: r.job_company_name || null,
    current_company_domain: r.job_company_website || null,
    location_city: r.location_locality ? titleCase(r.location_locality) : null,
    location_state: r.location_region ? normalizeState(r.location_region) : null,
    past_company_where_product_used: pastCompany,
    target_product: targetProduct || null,
    usage_confidence: usesProduct ? 'HIGH' : 'LOW',
    usage_evidence: usesProduct ? `Lists ${targetProduct} in profile skills :: ${r.linkedin_url || ''}` : '',
    job_change_date: r.job_start_date || null,
    role_influence: roleInfluence(r.job_title_levels),
    new_company_icp_fit: String(icpFromSize(r.job_company_size)),
    new_company_is_existing_customer: 'unknown',
    verified_email: email,
    email_confidence: email ? 'medium' : '',
    email_source: email ? 'pdl' : '',
    linkedin_url: r.linkedin_url ? (r.linkedin_url.startsWith('http') ? r.linkedin_url : `https://www.linkedin.com/in/${r.linkedin_url.replace(/^.*\/in\//, '')}`) : null,
    x_handle: r.twitter_username ? `@${r.twitter_username}` : null,
  };
}

/**
 * Search PDL for likely champions: people who list the target product in skills,
 * in the given geography. Returns champion rows (pre-engine).
 */
export async function searchChampions({ targetProduct, state, city, titles, size = 50 }) {
  const key = process.env.PDL_API_KEY;
  if (!key) {
    const e = new Error('Data API not configured. Set PDL_API_KEY (a paid People Data Labs plan) to pull champions automatically.');
    e.status = 503;
    throw e;
  }
  if (!targetProduct) {
    const e = new Error('A target product is required.');
    e.status = 400;
    throw e;
  }

  const must = [{ term: { skills: targetProduct.toLowerCase() } }];
  if (state) must.push({ term: { location_region: state.toLowerCase() } });
  if (city) must.push({ term: { location_locality: city.toLowerCase() } });
  if (Array.isArray(titles) && titles.length) {
    must.push({ terms: { job_title_role: titles.map((t) => String(t).toLowerCase()) } });
  }

  const body = { query: { bool: { must } }, size: Math.min(Math.max(size, 1), 100) };

  const res = await fetch(PDL_SEARCH, {
    method: 'POST',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 401) { const e = new Error('PDL rejected the API key.'); e.status = 402; throw e; }
  if (res.status === 402 || res.status === 403) { const e = new Error('PDL request not permitted on this plan / out of credits.'); e.status = 402; throw e; }
  if (res.status === 404) return { rows: [], total: 0 }; // no matches
  if (!res.ok) { const e = new Error(`PDL search failed (${res.status}).`); e.status = 502; throw e; }

  const data = await res.json();
  const rows = (data.data || []).map((r) => mapPdlRecord(r, { targetProduct })).filter(Boolean);
  return { rows, total: data.total ?? rows.length };
}
