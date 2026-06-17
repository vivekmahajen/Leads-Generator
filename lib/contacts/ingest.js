// lib/contacts/ingest.js
// Normalize and ingest raw contacts (from a LinkedIn export upload or a Twitter
// search) into raw_contacts, with dedup on (platform, profile_url) and scoring.

import { db } from '@/lib/db';
import { scoreContact } from '@/lib/scoring';
import { detectCategory } from '@/lib/categories';

function normalizeLinkedInUrl(url) {
  if (!url) return null;
  const m = String(url).match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? `https://www.linkedin.com/in/${m[1]}` : String(url);
}

function extractDomain(website) {
  if (!website) return null;
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const pick = (raw, keys) => {
  for (const k of keys) {
    if (raw[k] != null && String(raw[k]).trim() !== '') return String(raw[k]).trim();
  }
  return '';
};

// Normalize a raw LinkedIn profile object (from CSV/JSON export) to our shape.
export function normalizeLinkedInProfile(raw) {
  const fullName = pick(raw, ['full_name', 'Full Name', 'name']) || [pick(raw, ['first_name', 'First Name']), pick(raw, ['last_name', 'Last Name'])].filter(Boolean).join(' ');
  const parts = fullName.trim().split(/\s+/);
  const location = pick(raw, ['location', 'Location']);
  const profileUrl = normalizeLinkedInUrl(pick(raw, ['linkedin_url', 'LinkedIn URL', 'profile_url', 'url']));

  return {
    sourcePlatform: 'linkedin',
    sourceType: pick(raw, ['source_type']) || 'people_search',
    fullName,
    firstName: pick(raw, ['first_name', 'First Name']) || parts[0] || '',
    lastName: pick(raw, ['last_name', 'Last Name']) || parts.slice(1).join(' ') || '',
    profileUrl,
    linkedinUrl: profileUrl,
    headline: pick(raw, ['headline', 'Headline', 'title']),
    companyName: pick(raw, ['company', 'Company', 'company_name']),
    companyDomain: extractDomain(pick(raw, ['company_website', 'website', 'company_domain'])),
    jobTitle: pick(raw, ['job_title', 'Job Title', 'position']),
    city: pick(raw, ['city', 'City']) || (location ? location.split(',')[0].trim() : ''),
    state: pick(raw, ['state', 'State']) || (location.split(',')[1] || '').trim(),
    country: pick(raw, ['country', 'Country']) || 'US',
    email: pick(raw, ['email', 'Email']) || null,
    emailVerified: Boolean(raw.email_verified),
  };
}

// Upsert a single normalized contact (dedup by platform+profileUrl). Returns
// { created: boolean }.
async function upsertContact(c, { userId, categoryId }) {
  const headlineText = [c.headline, c.jobTitle, c.companyName, c.sourceTweetText].filter(Boolean).join(' ');
  const category = categoryId || c.categoryId || detectCategory(headlineText);
  const intentScore = c.intentScore ?? scoreContact(c, c.sourcePlatform, c.sourceType);
  const data = {
    ...c,
    userId,
    categoryId: category,
    intentScore,
    enrichmentStatus: c.email ? 'enriched' : 'pending',
    emailSource: c.emailSource || (c.email ? 'manual' : null),
  };

  if (!c.profileUrl) {
    await db.rawContact.create({ data });
    return { created: true };
  }

  const existing = await db.rawContact.findUnique({
    where: { sourcePlatform_profileUrl: { sourcePlatform: c.sourcePlatform, profileUrl: c.profileUrl } },
  });
  if (existing) {
    // Don't let a sparser duplicate erase known fields/category.
    await db.rawContact.update({
      where: { id: existing.id },
      data: {
        headline: c.headline || existing.headline,
        jobTitle: c.jobTitle || existing.jobTitle,
        companyName: c.companyName || existing.companyName,
        companyDomain: c.companyDomain || existing.companyDomain,
        intentScore: Math.max(intentScore, existing.intentScore),
        categoryId: category || existing.categoryId,
      },
    });
    return { created: false };
  }
  await db.rawContact.create({ data });
  return { created: true };
}

/**
 * Ingest an array of already-normalized contacts (LinkedIn or Twitter shape).
 * @returns {{ added, duplicates, failed }}
 */
export async function ingestContacts(contacts, { userId, categoryId }) {
  const results = { added: 0, duplicates: 0, failed: 0 };
  for (const c of contacts) {
    try {
      const { created } = await upsertContact(c, { userId, categoryId });
      if (created) results.added += 1;
      else results.duplicates += 1;
    } catch (err) {
      console.error('ingest error:', err.message);
      results.failed += 1;
    }
  }
  return results;
}

/** Ingest raw LinkedIn export rows (CSV/JSON) — normalizes first. */
export async function ingestLinkedInProfiles(profiles, { userId, categoryId }) {
  const normalized = profiles.map(normalizeLinkedInProfile).filter((c) => c.firstName || c.profileUrl);
  return ingestContacts(normalized, { userId, categoryId });
}
