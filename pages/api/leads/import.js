// pages/api/leads/import.js
// Authenticated CSV import — load REAL leads from any source (Apollo export,
// a purchased list, your own outreach) into the user's dashboard.
//
// POST body: { csv: "<raw csv text>", default_category?: "<category id>" }
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP, CATEGORIES } from '@/lib/categories';
import { parseCSV } from '@/lib/csv';
import { scoreLead } from '@/lib/leadScore';

// Header name → canonical field, allowing common variants.
const FIELD_ALIASES = {
  first_name: ['first_name', 'firstname', 'first', 'given_name'],
  last_name: ['last_name', 'lastname', 'last', 'surname', 'family_name'],
  name: ['name', 'full_name', 'fullname', 'contact_name'],
  email: ['email', 'email_address', 'work_email', 'e_mail'],
  phone: ['phone', 'phone_number', 'mobile', 'direct_dial', 'telephone', 'cell'],
  company_name: ['company_name', 'company', 'organization', 'organization_name', 'employer', 'account'],
  job_title: ['job_title', 'title', 'role', 'position'],
  city: ['city', 'town'],
  state: ['state', 'region', 'province'],
  country: ['country'],
  category: ['category', 'category_id', 'industry', 'vertical'],
  intent_score: ['intent_score', 'intent', 'score'],
  notes: ['notes', 'note', 'comments', 'message'],
};

const NAME_BY_LOWER = Object.fromEntries(CATEGORIES.map((c) => [c.name.toLowerCase(), c.id]));

const get = (row, keys) => {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return null;
};

function resolveCategory(raw, fallback) {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (CATEGORY_MAP[v]) return v;
  if (NAME_BY_LOWER[v]) return NAME_BY_LOWER[v];
  return fallback;
}

function mapRow(row, fallbackCategory) {
  let firstName = get(row, FIELD_ALIASES.first_name);
  let lastName = get(row, FIELD_ALIASES.last_name);
  const fullName = get(row, FIELD_ALIASES.name);
  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts.shift();
    lastName = lastName || (parts.length ? parts.join(' ') : null);
  }

  const email = get(row, FIELD_ALIASES.email);
  const phone = get(row, FIELD_ALIASES.phone);
  if (!firstName) return { error: 'missing name' };
  if (!email && !phone) return { error: 'missing email/phone' };

  const categoryId = resolveCategory(get(row, FIELD_ALIASES.category), fallbackCategory);
  if (!categoryId) return { error: 'no category (set a default)' };

  const companyName = get(row, FIELD_ALIASES.company_name);
  const jobTitle = get(row, FIELD_ALIASES.job_title);
  const notes = get(row, FIELD_ALIASES.notes);
  const rawScore = parseInt(get(row, FIELD_ALIASES.intent_score), 10);
  const intentScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, rawScore))
    : scoreLead({ email, phone, companyName, jobTitle, notes });

  return {
    lead: {
      categoryId,
      firstName,
      lastName: lastName || null,
      email,
      phone,
      companyName,
      jobTitle,
      city: get(row, FIELD_ALIASES.city),
      state: get(row, FIELD_ALIASES.state),
      country: get(row, FIELD_ALIASES.country) || 'US',
      intentScore,
      source: 'csv_import',
    },
    notes,
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { csv, default_category } = req.body || {};
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ message: 'A CSV payload is required' });
  }

  const fallbackCategory = default_category && CATEGORY_MAP[default_category] ? default_category : null;

  const rows = parseCSV(csv);
  if (!rows.length) return res.status(400).json({ message: 'No data rows found in the CSV' });
  if (rows.length > 2000) return res.status(400).json({ message: 'Please import 2000 rows or fewer at a time' });

  let imported = 0;
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i], fallbackCategory);
    if (mapped.error) {
      skipped.push({ row: i + 2, reason: mapped.error }); // +2: header + 1-indexed
      continue;
    }
    const lead = await db.lead.create({ data: mapped.lead });
    await db.leadDelivery.create({
      data: { leadId: lead.id, userId: user.id, categoryId: mapped.lead.categoryId, status: 'new', notes: mapped.notes },
    });
    imported += 1;
  }

  return res.status(201).json({ imported, skipped: skipped.length, skipped_detail: skipped.slice(0, 20) });
}

export default withErrorHandler(handler);
