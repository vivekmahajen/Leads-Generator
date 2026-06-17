// lib/enrichment/emailWaterfall.js
// Free-tier email enrichment waterfall: Hunter.io (25/mo) → Snov.io (50/mo) →
// pattern guess + MX verify (free). Tracks monthly usage in enrichment_log so
// free limits aren't exceeded.

import { db } from '@/lib/db';

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const SNOV_CLIENT_ID = process.env.SNOV_CLIENT_ID;
const SNOV_CLIENT_SECRET = process.env.SNOV_CLIENT_SECRET;

// ── Hunter.io ─────────────────────────────────────────────────────
async function tryHunter(firstName, lastName, domain) {
  if (!HUNTER_API_KEY) return null;
  try {
    const url = new URL('https://api.hunter.io/v2/email-finder');
    url.searchParams.set('domain', domain);
    url.searchParams.set('first_name', firstName);
    url.searchParams.set('last_name', lastName || '');
    url.searchParams.set('api_key', HUNTER_API_KEY);
    const res = await fetch(url);
    const data = await res.json();
    if (data.data?.email) {
      return { email: data.data.email, confidence: data.data.score, verified: data.data.score >= 90, source: 'hunter' };
    }
  } catch (err) {
    console.warn('Hunter error:', err.message);
  }
  return null;
}

// ── Snov.io ───────────────────────────────────────────────────────
let snovToken = null;
let snovExpiry = 0;
async function getSnovToken() {
  if (snovToken && Date.now() < snovExpiry) return snovToken;
  const res = await fetch('https://api.snov.io/v1/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: SNOV_CLIENT_ID, client_secret: SNOV_CLIENT_SECRET }),
  });
  const data = await res.json();
  snovToken = data.access_token;
  snovExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  return snovToken;
}

async function trySnov(firstName, lastName, domain) {
  if (!SNOV_CLIENT_ID || !SNOV_CLIENT_SECRET) return null;
  try {
    const token = await getSnovToken();
    const res = await fetch('https://api.snov.io/v1/get-emails-from-names', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, domain }),
    });
    const data = await res.json();
    if (data.success && data.emails?.length) {
      const best = data.emails[0];
      return { email: best.email, confidence: best.confidence, verified: best.status === 'valid', source: 'snov' };
    }
  } catch (err) {
    console.warn('Snov error:', err.message);
  }
  return null;
}

// ── Pattern guess + MX verify (zero cost) ─────────────────────────
async function checkMX(domain) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    const data = await res.json();
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

async function tryEmailPattern(firstName, lastName, domain) {
  if (!firstName || !lastName || !domain) return null;
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  if (!f || !l) return null;
  if (!(await checkMX(domain))) return null;
  return { email: `${f}.${l}@${domain}`, confidence: 55, verified: false, source: 'pattern' };
}

// ── Usage tracking ────────────────────────────────────────────────
async function monthlyUsage(service) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return db.enrichmentLog.count({ where: { service, createdAt: { gte: start }, result: 'found' } });
}

async function logEnrichment(service, contactId, result) {
  await db.enrichmentLog.create({ data: { service, contactId: contactId || null, result, creditsUsed: 1 } });
}

// ── Waterfall ─────────────────────────────────────────────────────
export async function enrichEmail(contact) {
  const firstName = contact.firstName || contact.first_name;
  const lastName = contact.lastName || contact.last_name;
  const domain = contact.companyDomain || contact.company_domain;
  if (!firstName || !domain) return null;

  const [hunterUsed, snovUsed] = await Promise.all([monthlyUsage('hunter'), monthlyUsage('snov')]);

  let result = null;
  if (HUNTER_API_KEY && hunterUsed < 25) {
    result = await tryHunter(firstName, lastName, domain);
    await logEnrichment('hunter', contact.id, result ? 'found' : 'not_found');
  }
  if (!result && SNOV_CLIENT_ID && snovUsed < 50) {
    result = await trySnov(firstName, lastName, domain);
    await logEnrichment('snov', contact.id, result ? 'found' : 'not_found');
  }
  if (!result) {
    result = await tryEmailPattern(firstName, lastName, domain);
    if (result) await logEnrichment('pattern', contact.id, 'found');
  }
  return result;
}

/** Enrich a single stored contact and persist the outcome. Returns the updated row. */
export async function enrichContact(contactId) {
  const contact = await db.rawContact.findUnique({ where: { id: contactId } });
  if (!contact) return null;
  const result = await enrichEmail(contact);
  return db.rawContact.update({
    where: { id: contact.id },
    data: {
      email: result?.email || contact.email || null,
      emailVerified: result?.verified ?? contact.emailVerified,
      emailSource: result?.source || contact.emailSource || null,
      enrichmentStatus: result ? 'enriched' : 'no_email',
      enrichedAt: new Date(),
    },
  });
}

/** Background bulk enrichment — highest-intent pending contacts first. */
export async function runBulkEnrichment(limit = 50) {
  const contacts = await db.rawContact.findMany({
    where: { enrichmentStatus: 'pending', companyDomain: { not: null } },
    orderBy: { intentScore: 'desc' },
    take: limit,
  });
  let enriched = 0;
  for (const c of contacts) {
    const updated = await enrichContact(c.id);
    if (updated?.email) enriched += 1;
    await new Promise((r) => setTimeout(r, 300));
  }
  return { processed: contacts.length, enriched };
}
