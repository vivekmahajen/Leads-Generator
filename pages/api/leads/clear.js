// pages/api/leads/clear.js
// Deletes all of the authenticated user's delivered leads (and the now-orphaned
// lead records). Used by the dashboard "Clear my leads" action so demo data can
// be reset and regenerated. Only ever affects the calling user's own data.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const deliveries = await db.leadDelivery.findMany({
    where: { userId: user.id },
    select: { leadId: true },
  });
  const leadIds = deliveries.map((d) => d.leadId);

  await db.leadDelivery.deleteMany({ where: { userId: user.id } });

  // Remove lead records that no longer have any delivery.
  let removedLeads = 0;
  if (leadIds.length) {
    const result = await db.lead.deleteMany({
      where: { id: { in: leadIds }, deliveries: { none: {} } },
    });
    removedLeads = result.count;
  }

  return res.status(200).json({ cleared: deliveries.length, removedLeads });
}

export default withErrorHandler(handler);
