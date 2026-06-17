// pages/api/leads/index.js
// List the authenticated user's delivered leads with filtering, pagination
// and aggregate stats for the dashboard KPI strip.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { getCategory } from '@/lib/categories';

const PAGE_SIZE = 50;

// Parse the low end of a "$8,000 commission" style string into a number.
function parseDealValue(avgDealSize) {
  if (!avgDealSize) return 0;
  const match = avgDealSize.replace(/,/g, '').match(/\$?(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { category = 'all', status = 'all', page = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const where = { userId: user.id };
  if (category !== 'all') where.categoryId = category;
  if (status !== 'all') where.status = status;

  const [deliveries, total] = await Promise.all([
    db.leadDelivery.findMany({
      where,
      include: { lead: true },
      orderBy: { deliveredAt: 'desc' },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.leadDelivery.count({ where }),
  ]);

  // Flatten delivery + lead into the shape the dashboard expects
  const leads = deliveries.map((d) => ({
    id: d.id,
    lead_id: d.leadId,
    category_id: d.categoryId || d.lead?.categoryId,
    first_name: d.lead?.firstName,
    last_name: d.lead?.lastName,
    email: d.lead?.email,
    phone: d.lead?.phone,
    company_name: d.lead?.companyName,
    job_title: d.lead?.jobTitle,
    city: d.lead?.city,
    state: d.lead?.state,
    intent_score: d.lead?.intentScore ?? 0,
    source: d.lead?.source,
    status: d.status,
    delivered_at: d.deliveredAt,
  }));

  // Aggregate stats (across all of the user's deliveries, not just this page)
  const allForStats = await db.leadDelivery.findMany({
    where: { userId: user.id },
    include: { lead: true },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let converted = 0;
  let thisMonth = 0;
  let pipeline = 0;
  for (const d of allForStats) {
    if (d.status === 'converted') converted += 1;
    if (d.deliveredAt >= startOfMonth) thisMonth += 1;
    if (d.status !== 'rejected') {
      const cat = getCategory(d.categoryId || d.lead?.categoryId);
      pipeline += parseDealValue(cat?.avgDealSize);
    }
  }

  return res.status(200).json({
    leads,
    pagination: { page: pageNum, pageSize: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) },
    stats: {
      total: allForStats.length,
      thisMonth,
      converted,
      pipeline,
    },
  });
}

export default withErrorHandler(handler);
