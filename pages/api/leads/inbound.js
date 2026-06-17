// pages/api/leads/inbound.js
// PUBLIC endpoint (no auth) that accepts REAL inbound leads — from your capture
// form, a website embed, Zapier, or Facebook/Google Lead Ads webhooks — and
// delivers them to the target account's dashboard.
//
// POST body:
//   {
//     "to": "<recipient user id>",        // required — routes the lead to an account
//     "category_id": "real_estate",        // required — must be a valid category
//     "first_name": "...", "last_name": "...",
//     "email": "...", "phone": "...",      // at least one of email/phone required
//     "company_name": "...", "job_title": "...",
//     "city": "...", "state": "...", "country": "US",
//     "notes": "...", "source": "facebook_lead_ads"
//   }
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { CATEGORY_MAP } from '@/lib/categories';
import { rateLimit } from '@/lib/rateLimit';

// A real inbound lead scores on how complete/contactable it is.
function scoreLead({ email, phone, companyName, jobTitle, notes }) {
  let score = 35;
  if (email) score += 15;
  if (phone) score += 20;
  if (companyName) score += 15;
  if (jobTitle) score += 5;
  if (notes) score += 10;
  return Math.min(100, score);
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const b = req.body || {};
  const to = b.to || b.owner;
  const categoryId = b.category_id || b.category;

  if (!to) return res.status(400).json({ error: 'MISSING_RECIPIENT', message: 'A recipient account id ("to") is required' });
  if (!categoryId || !CATEGORY_MAP[categoryId]) {
    return res.status(400).json({ error: 'INVALID_CATEGORY', message: 'A valid category_id is required' });
  }

  const email = b.email?.trim() || null;
  const phone = b.phone?.trim() || null;
  const firstName = b.first_name?.trim() || b.name?.trim() || null;
  if (!email && !phone) {
    return res.status(400).json({ error: 'NO_CONTACT', message: 'An email or phone number is required' });
  }
  if (!firstName) {
    return res.status(400).json({ error: 'NO_NAME', message: 'A name is required' });
  }

  // Basic abuse protection: cap submissions per recipient per IP.
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const { allowed } = rateLimit(`inbound:${to}:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many submissions, try again later' });

  // Recipient must be a real account. Validate the id shape first so a malformed
  // value returns a clean 404 instead of a database error.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(String(to))) {
    return res.status(404).json({ error: 'UNKNOWN_RECIPIENT', message: 'Recipient account not found' });
  }
  const owner = await db.user.findUnique({ where: { id: to } });
  if (!owner) return res.status(404).json({ error: 'UNKNOWN_RECIPIENT', message: 'Recipient account not found' });

  const companyName = b.company_name?.trim() || null;
  const jobTitle = b.job_title?.trim() || null;
  const notes = b.notes?.trim() || null;

  const lead = await db.lead.create({
    data: {
      categoryId,
      firstName,
      lastName: b.last_name?.trim() || null,
      email,
      phone,
      companyName,
      jobTitle,
      city: b.city?.trim() || null,
      state: b.state?.trim() || null,
      country: b.country?.trim() || 'US',
      qualificationData: b.qualification_data || null,
      intentScore: scoreLead({ email, phone, companyName, jobTitle, notes }),
      source: b.source?.trim() || 'inbound_form',
    },
  });

  await db.leadDelivery.create({
    data: { leadId: lead.id, userId: owner.id, categoryId, status: 'new', notes },
  });

  return res.status(201).json({ ok: true, lead_id: lead.id });
}

export default withErrorHandler(handler);
