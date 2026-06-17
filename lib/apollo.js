// lib/apollo.js
// Server-side Apollo.io People Search client. Requires APOLLO_API_KEY (a paid
// Apollo plan — the People Search API is gated on the free plan).
//
// Maps each LeadForge category to relevant Apollo prospecting filters
// (decision-maker titles + organization keywords), searches US people, and
// returns lead-shaped records. Search does NOT spend enrichment credits and
// does NOT reliably return emails/phones (those require enrichment) — but it
// returns real names, titles, companies and locations.

const APOLLO_SEARCH_URL = 'https://api.apollo.io/api/v1/mixed_people/search';

// Per-category Apollo filters. Anything not listed uses GENERIC.
const GENERIC = { titles: ['owner', 'founder', 'ceo', 'president', 'director'], keywords: [] };
const CATEGORY_FILTERS = {
  real_estate:       { titles: ['broker', 'realtor', 'real estate agent', 'managing broker'], keywords: ['real estate'] },
  insurance:         { titles: ['insurance agent', 'agency owner', 'broker'], keywords: ['insurance'] },
  fintech_loans:     { titles: ['loan officer', 'mortgage broker', 'principal', 'founder'], keywords: ['lending', 'fintech', 'mortgage'] },
  edtech:            { titles: ['founder', 'principal', 'director of admissions'], keywords: ['education', 'edtech'] },
  saas_software:     { titles: ['vp sales', 'cto', 'head of it', 'founder', 'ceo'], keywords: ['saas', 'software'] },
  healthcare:        { titles: ['practice owner', 'administrator', 'physician', 'clinic director'], keywords: ['healthcare', 'medical', 'clinic'] },
  automotive:        { titles: ['dealer principal', 'general manager', 'owner'], keywords: ['automotive', 'car dealership'] },
  legal:             { titles: ['attorney', 'partner', 'managing partner'], keywords: ['law firm', 'legal'] },
  ecommerce:         { titles: ['founder', 'ecommerce manager', 'owner'], keywords: ['ecommerce', 'dtc'] },
  solar_energy:      { titles: ['owner', 'founder', 'operations manager'], keywords: ['solar', 'renewable energy'] },
  hr_recruitment:    { titles: ['head of hr', 'recruiter', 'talent acquisition', 'owner'], keywords: ['staffing', 'recruiting'] },
  agriculture:       { titles: ['owner', 'founder', 'farm manager'], keywords: ['agriculture', 'agtech', 'farming'] },
  wedding_events:    { titles: ['owner', 'event planner', 'venue manager'], keywords: ['events', 'wedding'] },
  travel_tourism:    { titles: ['owner', 'travel agent', 'founder'], keywords: ['travel', 'tourism'] },
  interior_design:   { titles: ['interior designer', 'principal', 'owner'], keywords: ['interior design'] },
  digital_marketing: { titles: ['ceo', 'founder', 'marketing director'], keywords: ['marketing agency', 'advertising'] },
  fitness_wellness:  { titles: ['owner', 'founder', 'gym manager'], keywords: ['fitness', 'wellness', 'gym'] },
  beauty_salon:      { titles: ['owner', 'salon manager', 'founder'], keywords: ['salon', 'beauty', 'spa'] },
  restaurant_food:   { titles: ['owner', 'general manager', 'founder'], keywords: ['restaurant', 'catering', 'food service'] },
  printing_packaging:{ titles: ['owner', 'sales manager', 'founder'], keywords: ['printing', 'packaging'] },
  logistics:         { titles: ['operations director', 'logistics manager', 'owner'], keywords: ['logistics', '3pl', 'freight'] },
  construction:      { titles: ['project manager', 'general contractor', 'owner'], keywords: ['construction', 'building'] },
  manufacturing:     { titles: ['plant manager', 'procurement manager', 'owner'], keywords: ['manufacturing', 'industrial'] },
  pet_services:      { titles: ['owner', 'practice manager', 'founder'], keywords: ['veterinary', 'pet'] },
  pharma_biotech:    { titles: ['director', 'procurement', 'founder'], keywords: ['pharmaceutical', 'biotech'] },
  gaming_esports:    { titles: ['founder', 'ceo', 'marketing director'], keywords: ['gaming', 'esports'] },
  media_entertainment:{ titles: ['producer', 'founder', 'marketing director'], keywords: ['media', 'entertainment', 'production'] },
  spiritual_wellness:{ titles: ['owner', 'founder', 'director'], keywords: ['wellness', 'meditation', 'yoga'] },
};

function isUsableEmail(email) {
  if (!email) return false;
  // Apollo returns locked-email placeholders for un-enriched contacts.
  return !/email_not_unlocked|domain\.com$/i.test(email);
}

/** Map an Apollo person object to LeadForge lead fields. */
export function mapApolloPerson(p, categoryId) {
  const org = p.organization || p.account || {};
  const phone = p.phone_numbers?.[0]?.sanitized_number || p.phone_numbers?.[0]?.raw_number || null;
  return {
    categoryId,
    firstName: p.first_name || (p.name ? p.name.split(' ')[0] : null),
    lastName: p.last_name || null,
    email: isUsableEmail(p.email) ? p.email : null,
    phone,
    companyName: org.name || null,
    jobTitle: p.title || null,
    city: p.city || null,
    state: p.state || null,
    country: p.country || 'US',
    qualificationData: p.linkedin_url ? { linkedin_url: p.linkedin_url } : null,
    intentScore: 60,
    source: 'apollo',
  };
}

/**
 * Search Apollo for people matching a category. Returns { people } on success.
 * Throws an Error with a `.status` and friendly `.message` on failure.
 */
export async function searchApolloPeople(categoryId, perPage = 25) {
  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    const e = new Error('Apollo is not configured. Set APOLLO_API_KEY (a paid Apollo plan) to fetch real leads.');
    e.status = 503;
    throw e;
  }

  const f = CATEGORY_FILTERS[categoryId] || GENERIC;
  const body = {
    person_titles: f.titles,
    q_organization_keyword_tags: f.keywords,
    person_locations: ['United States'],
    page: 1,
    per_page: Math.min(Math.max(perPage, 1), 100),
  };

  const res = await fetch(APOLLO_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': key },
    body: JSON.stringify(body),
  });

  if (res.status === 401 || res.status === 403) {
    const e = new Error('Apollo rejected the request — the People Search API requires a paid Apollo plan. Upgrade at app.apollo.io, then try again.');
    e.status = 402;
    throw e;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const e = new Error(`Apollo request failed (${res.status}). ${text.slice(0, 200)}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  return { people: Array.isArray(data.people) ? data.people : [] };
}

export { CATEGORY_FILTERS };
