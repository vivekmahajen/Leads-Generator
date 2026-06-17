// pages/api/saved-searches/index.js  — list (GET) + create (POST) saved searches
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const searches = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ searches });
  }

  if (req.method === 'POST') {
    const { query, category_id, label, platform = 'twitter', frequency = 'daily' } = req.body || {};
    if (!query) return res.status(400).json({ message: 'A search query is required' });
    const search = await db.savedSearch.create({
      data: {
        userId: user.id,
        searchQuery: query,
        categoryId: category_id || null,
        label: label || query.slice(0, 50),
        platform,
        runFrequency: frequency,
        active: true,
      },
    });
    return res.status(201).json({ search });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withErrorHandler(handler);
