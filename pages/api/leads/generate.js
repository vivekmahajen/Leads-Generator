// pages/api/leads/generate.js
// Generates sample leads for the *currently authenticated* user so their
// dashboard shows data without needing the CLI seed script. Demo/MVP helper —
// it only ever writes to the calling user's own account. US-based sample data.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { makeLead, makeDeliveryMeta, pick } from '@/lib/sampleData';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 40, 1), 100);

  // Categories: explicit request → user's saved categories → default spread.
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
    const lead = await db.lead.create({ data: makeLead(categoryId, `${Date.now()}${i}`) });
    await db.leadDelivery.create({
      data: { leadId: lead.id, userId: user.id, categoryId, ...makeDeliveryMeta() },
    });
  }

  return res.status(201).json({ generated: count, categories: categoryIds });
}

export default withErrorHandler(handler);
