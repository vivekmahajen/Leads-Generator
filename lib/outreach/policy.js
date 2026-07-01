// lib/outreach/policy.js
// Pure send-policy helpers (no DB) — region rules + enrollable-email check.

const RISKY_SOURCES = ['guess', 'pattern'];

// EU/UK/India: opt-out cold email isn't a safe basis — flag rather than blast.
const RESTRICTED_REGIONS = new Set([
  'IN', 'GB', 'UK',
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

export function regionOf(lead) {
  const c = (lead.country || '').trim().toUpperCase();
  if (!c || c === 'US' || c === 'USA' || c === 'UNITED STATES') return 'US';
  return c;
}

export function isRestrictedRegion(lead) {
  return RESTRICTED_REGIONS.has(regionOf(lead));
}

// Enroll-time email check (no network): must have an email from a non-risky source.
export function enrollableEmail(lead) {
  if (!lead.email) return { ok: false, reason: 'no email address' };
  if (RISKY_SOURCES.includes(lead.source)) return { ok: false, reason: 'unverified email (guessed) — verify first' };
  return { ok: true };
}
