// lib/sources/osm.js
// FREE real business leads from OpenStreetMap — no API key, no paid plan.
// Geocodes a location via Nominatim, then queries the Overpass API for real
// businesses (name, phone, website, address) by category. Open data (ODbL).

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const UA = 'LeadForge/1.0 (lead-generation app)';

// Category → OSM tag selectors. `keywords` is a name-based fallback for
// categories OSM doesn't tag cleanly.
const CATEGORY_OSM = {
  real_estate:       { tags: [['office', 'estate_agent']], keywords: ['realty', 'real estate'] },
  insurance:         { tags: [['office', 'insurance']], keywords: ['insurance'] },
  fintech_loans:     { tags: [['office', 'financial'], ['amenity', 'bank']], keywords: ['loans', 'mortgage'] },
  edtech:            { tags: [['amenity', 'college'], ['office', 'educational_institution']], keywords: ['academy', 'institute', 'tutoring'] },
  saas_software:     { tags: [['office', 'it'], ['office', 'company']], keywords: ['software', 'technologies', 'systems'] },
  healthcare:        { tags: [['amenity', 'clinic'], ['amenity', 'doctors'], ['amenity', 'dentist']], keywords: ['clinic', 'medical'] },
  discharge_planning:{ tags: [['amenity', 'hospital'], ['amenity', 'nursing_home'], ['healthcare', 'hospice'], ['healthcare', 'nursing_home']], keywords: ['hospice', 'skilled nursing', 'nursing home', 'rehabilitation'] },
  automotive:        { tags: [['shop', 'car'], ['shop', 'car_repair']], keywords: ['auto', 'motors'] },
  legal:             { tags: [['office', 'lawyer']], keywords: ['law', 'attorney', 'legal'] },
  ecommerce:         { tags: [['office', 'company']], keywords: ['ecommerce', 'online store'] },
  solar_energy:      { tags: [['craft', 'solar']], keywords: ['solar', 'renewable'] },
  hr_recruitment:    { tags: [['office', 'employment_agency']], keywords: ['staffing', 'recruit'] },
  agriculture:       { tags: [['shop', 'agrarian']], keywords: ['farm', 'agri'] },
  wedding_events:    { tags: [['shop', 'wedding']], keywords: ['events', 'wedding', 'banquet'] },
  travel_tourism:    { tags: [['shop', 'travel_agency']], keywords: ['travel', 'tours'] },
  interior_design:   { tags: [['shop', 'interior_decoration']], keywords: ['interior', 'decor'] },
  digital_marketing: { tags: [['office', 'advertising_agency']], keywords: ['marketing', 'media', 'agency'] },
  fitness_wellness:  { tags: [['leisure', 'fitness_centre']], keywords: ['fitness', 'gym', 'yoga'] },
  beauty_salon:      { tags: [['shop', 'hairdresser'], ['shop', 'beauty']], keywords: ['salon', 'spa'] },
  restaurant_food:   { tags: [['amenity', 'restaurant'], ['amenity', 'cafe']], keywords: ['catering'] },
  printing_packaging:{ tags: [['shop', 'copyshop'], ['craft', 'printer']], keywords: ['printing', 'packaging'] },
  logistics:         { tags: [['office', 'logistics']], keywords: ['logistics', 'freight', 'courier'] },
  construction:      { tags: [['craft', 'builder'], ['office', 'construction_company']], keywords: ['construction', 'builders'] },
  manufacturing:     { tags: [['man_made', 'works']], keywords: ['manufacturing', 'industries', 'factory'] },
  pet_services:      { tags: [['amenity', 'veterinary'], ['shop', 'pet']], keywords: ['veterinary', 'pet'] },
  pharma_biotech:    { tags: [['office', 'company']], keywords: ['pharma', 'biotech', 'laboratories'] },
  media_entertainment:{ tags: [['office', 'company']], keywords: ['media', 'productions', 'studios'] },
  spiritual_wellness:{ tags: [['amenity', 'place_of_worship']], keywords: ['wellness', 'meditation', 'yoga'] },
};

const US_STATE_ABBR = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

// Normalize a state value to a US 2-letter code when recognizable.
export function normalizeState(s) {
  if (!s) return null;
  const v = String(s).trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return US_STATE_ABBR[v.toLowerCase()] || v;
}

function domainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function geocode(location) {
  // US-only: restrict geocoding to United States places.
  const url = `${NOMINATIM}?q=${encodeURIComponent(location)}&format=json&addressdetails=1&countrycodes=us&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) {
    const e = new Error('Could not look up that location right now. Try again shortly.');
    e.status = 502;
    throw e;
  }
  const data = await res.json();
  if (!data.length) {
    const e = new Error(`Couldn't find the US location "${location}". Try "City, ST" (e.g. "Austin, TX").`);
    e.status = 404;
    throw e;
  }
  // Nominatim boundingbox: [south, north, west, east]
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  const regionState = normalizeState(data[0].address?.state);
  return { south, north, west, east, display: data[0].display_name, regionState };
}

export function buildQuery({ south, west, north, east }, categoryId, limit) {
  const cfg = CATEGORY_OSM[categoryId] || { tags: [['office', 'company']], keywords: [] };
  const bbox = `(${south},${west},${north},${east})`;
  const lines = [];
  for (const [k, v] of cfg.tags) lines.push(`nwr["${k}"="${v}"]["name"]${bbox};`);
  for (const kw of cfg.keywords) lines.push(`nwr["name"~"${kw}",i]${bbox};`);
  return `[out:json][timeout:25];(${lines.join('')});out center ${limit};`;
}

export function elementToContact(el, categoryId) {
  const t = el.tags || {};
  const name = t.name;
  if (!name) return null;
  const website = t.website || t['contact:website'] || null;
  const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
  const email = t.email || t['contact:email'] || null;
  const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
  return {
    sourcePlatform: 'osm',
    sourceType: 'local_business',
    fullName: name,
    firstName: name, // business name (no individual on a directory listing)
    lastName: null,
    companyName: name,
    companyDomain: domainFromUrl(website),
    headline: [t.description, [t['addr:street'], t['addr:city']].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
    profileUrl: website || osmUrl,
    twitterUrl: null,
    linkedinUrl: null,
    email,
    emailSource: email ? 'directory' : null,
    phone,
    city: t['addr:city'] || null,
    state: normalizeState(t['addr:state']),
    country: t['addr:country'] || 'US',
    sourceKeyword: t['addr:city'] || null,
    categoryId,
  };
}

/** Find real businesses for a category near a location. Returns contacts[]. */
export async function findLocalBusinesses(categoryId, location, limit = 120) {
  const box = await geocode(location);
  const query = buildQuery(box, categoryId, Math.min(Math.max(limit, 1), 120));
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (res.status === 429) {
    const e = new Error('OpenStreetMap is busy (rate limited). Try again in a minute.');
    e.status = 429;
    throw e;
  }
  if (!res.ok) {
    const e = new Error(`Business lookup failed (${res.status}).`);
    e.status = 502;
    throw e;
  }
  const data = await res.json();
  const seen = new Set();
  let scanned = 0;
  let listed = 0;
  let guessed = 0;
  const contacts = [];
  for (const el of data.elements || []) {
    const c = elementToContact(el, categoryId);
    if (!c) continue;
    const key = (c.profileUrl || c.companyName).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    scanned += 1;
    // Fall back to the searched region's state when the listing has none.
    if (!c.state && box.regionState) c.state = box.regionState;
    // Only keep businesses we can email. Prefer a listed email; otherwise derive
    // the standard business catch-all (info@domain) from their website, flagged
    // as a guess so it's clearly unverified.
    if (c.email) {
      listed += 1;
      contacts.push(c);
    } else if (c.companyDomain) {
      c.email = `info@${c.companyDomain}`;
      c.emailSource = 'guess';
      guessed += 1;
      contacts.push(c);
    }
  }
  return { contacts, scanned, listed, guessed, location: box.display };
}
