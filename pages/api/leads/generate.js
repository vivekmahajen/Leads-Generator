// pages/api/leads/generate.js
// Generates sample leads for the *currently authenticated* user so their
// dashboard shows data without needing the CLI seed script. Demo/MVP helper —
// it only ever writes to the calling user's own account.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Reyansh', 'Isha', 'Kabir', 'Myra', 'Arjun', 'Sara'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Khan', 'Gupta', 'Mehta', 'Singh', 'Rao'];
const CITIES = [['Mumbai', 'MH'], ['Bengaluru', 'KA'], ['Delhi', 'DL'], ['Chennai', 'TN'], ['Pune', 'MH'], ['Hyderabad', 'TS']];
const SOURCES = ['google_ads', 'facebook', 'organic', 'linkedin'];
const STATUSES = ['new', 'new', 'contacted', 'qualified', 'converted', 'rejected'];
const TITLES = ['Owner', 'Manager', 'Director', 'Buyer', 'Founder'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 40, 1), 100);

  // Determine which categories to generate for:
  // 1) explicit category_ids in the request, else
  // 2) the user's saved categories, else
  // 3) a sensible default spread.
  let categoryIds = Array.isArray(req.body?.category_ids) ? req.body.category_ids : null;
  if (!categoryIds || !categoryIds.length) {
    const saved = await db.userCategory.findMany({ where: { userId: user.id } });
    categoryIds = saved.map((c) => c.categoryId);
  }
  categoryIds = (categoryIds || []).filter((id) => CATEGORY_MAP[id]);
  if (!categoryIds.length) {
    categoryIds = ['real_estate', 'insurance', 'fintech_loans', 'legal', 'solar_energy'];
  }

  for (let i = 0; i < count; i++) {
    const categoryId = pick(categoryIds);
    const [city, state] = pick(CITIES);
    const first = pick(FIRST);
    const last = pick(LAST);
    const lead = await db.lead.create({
      data: {
        categoryId,
        firstName: first,
        lastName: last,
        email: `${first}.${last}${Date.now()}${i}@example.com`.toLowerCase(),
        phone: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
        companyName: Math.random() > 0.5 ? `${last} Enterprises` : null,
        jobTitle: pick(TITLES),
        city,
        state,
        intentScore: Math.floor(20 + Math.random() * 80),
        source: pick(SOURCES),
      },
    });
    await db.leadDelivery.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        categoryId,
        status: pick(STATUSES),
        deliveredAt: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000),
      },
    });
  }

  return res.status(201).json({ generated: count, categories: categoryIds });
}

export default withErrorHandler(handler);
