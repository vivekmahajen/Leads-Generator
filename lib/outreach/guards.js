// lib/outreach/guards.js
// DB-backed guards + re-exports of the pure policy helpers.
import { db } from '@/lib/db';

export { regionOf, isRestrictedRegion, enrollableEmail } from './policy';

export async function isSuppressed(userId, email) {
  if (!email) return true;
  const s = await db.suppression.findUnique({
    where: { userId_email: { userId, email: email.toLowerCase() } },
  });
  return Boolean(s);
}

async function checkMX(domain) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    const data = await res.json();
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

// Send-time deliverability: trust a prior verification, else re-check MX and cache.
export async function ensureDeliverable(lead) {
  if (lead.emailVerified) return true;
  const domain = lead.email?.split('@')[1];
  if (!domain) return false;
  const ok = await checkMX(domain);
  await db.lead.update({ where: { id: lead.id }, data: { emailVerified: ok, emailCheckedAt: new Date() } }).catch(() => {});
  return ok;
}
