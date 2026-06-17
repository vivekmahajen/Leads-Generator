// pages/api/leads/apollo-fetch.js
// Pull REAL leads from Apollo.io for a category and import them. Requires a paid
// Apollo plan + APOLLO_API_KEY (the People Search API is blocked on free plans).
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { searchApolloPeople, mapApolloPerson } from '@/lib/apollo';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const categoryId = req.body?.category_id;
  if (!categoryId || !CATEGORY_MAP[categoryId]) {
    return res.status(400).json({ message: 'A valid category_id is required' });
  }
  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 25, 1), 100);

  let people;
  try {
    ({ people } = await searchApolloPeople(categoryId, count));
  } catch (err) {
    // searchApolloPeople sets a meaningful status (503 not configured, 402 paid-only, 502 upstream)
    return res.status(err.status || 502).json({ error: 'APOLLO_ERROR', message: err.message });
  }

  let imported = 0;
  for (const person of people) {
    const data = mapApolloPerson(person, categoryId);
    if (!data.firstName) continue;
    const lead = await db.lead.create({ data });
    await db.leadDelivery.create({
      data: { leadId: lead.id, userId: user.id, categoryId, status: 'new' },
    });
    imported += 1;
  }

  return res.status(201).json({
    imported,
    found: people.length,
    note: imported < people.length ? 'Some records were skipped (incomplete).' : undefined,
  });
}

export default withErrorHandler(handler);
