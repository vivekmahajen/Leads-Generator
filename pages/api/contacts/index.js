// pages/api/contacts/index.js — list the user's raw contacts with filters.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

const PAGE_SIZE = 100;

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { platform = 'all', minScore = '0', emailStatus = 'all', categoryId = 'all', state = 'all', city = 'all', q = '', promoted = 'false' } = req.query;

  const where = { userId: user.id };
  if (platform !== 'all') where.sourcePlatform = platform;
  if (categoryId !== 'all') where.categoryId = categoryId;
  if (state !== 'all') where.state = state;
  if (city !== 'all') where.city = city;
  if (promoted === 'false') where.promotedToLead = false;
  const min = parseInt(minScore, 10) || 0;
  if (min > 0) where.intentScore = { gte: min };
  if (emailStatus === 'verified') where.emailVerified = true;
  else if (emailStatus === 'found') where.email = { not: null };
  else if (emailStatus === 'pending') where.email = null;
  const term = String(q).trim();
  if (term) {
    where.OR = [
      { fullName: { contains: term, mode: 'insensitive' } },
      { companyName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ];
  }

  const contacts = await db.rawContact.findMany({
    where,
    orderBy: [{ intentScore: 'desc' }, { scrapedAt: 'desc' }],
    take: PAGE_SIZE,
  });

  // Facets across the user's (un-promoted) contacts for the filter dropdowns.
  const all = await db.rawContact.findMany({
    where: { userId: user.id, promotedToLead: false },
    select: { state: true, city: true },
  });
  const states = [...new Set(all.map((c) => c.state).filter(Boolean))].sort();
  const cities = [...new Set(all.map((c) => c.city).filter(Boolean))].sort();

  return res.status(200).json({ contacts, facets: { states, cities } });
}

export default withErrorHandler(handler);
