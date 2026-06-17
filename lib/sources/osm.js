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

function domainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function geocode(location) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) {
    const e = new Error('Could not look up that location right now. Try again shortly.');
    e.status = 502;
    throw e;
  }
  const data = await res.json();
  if (!data.length) {
    const e = new Error(`Couldn't find the location "${location}". Try "City, State" or "City, Country".`);
    e.status = 404;
    throw e;
  }
  // Nominatim boundingbox: [south, north, west, east]
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east, display: data[0].display_name };
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
    phone,
    city: t['addr:city'] || null,
    state: t['addr:state'] || null,
    country: t['addr:country'] || null,
    sourceKeyword: t['addr:city'] || null,
    categoryId,
  };
}

/** Find real businesses for a category near a location. Returns contacts[]. */
export async function findLocalBusinesses(categoryId, location, limit = 60) {
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
  const contacts = [];
  for (const el of data.elements || []) {
    const c = elementToContact(el, categoryId);
    if (!c) continue;
    const key = (c.profileUrl || c.companyName).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    contacts.push(c);
  }
  return { contacts, location: box.display };
}
