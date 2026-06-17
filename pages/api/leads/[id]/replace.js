// pages/api/leads/[id]/replace.js
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { reason } = req.body || {};

  const delivery = await db.leadDelivery.findFirst({ where: { id, userId: user.id } });
  if (!delivery) return res.status(404).json({ message: 'Lead not found' });

  await db.leadDelivery.update({
    where: { id: delivery.id },
    data: {
      replacementRequested: true,
      rejectionReason: reason || 'not_qualified',
      status: 'rejected',
    },
  });

  return res.status(200).json({
    id: delivery.id,
    replacement_requested: true,
    message: 'Replacement requested. A new qualified lead will be delivered within 24 hours.',
  });
}

export default withErrorHandler(handler);
