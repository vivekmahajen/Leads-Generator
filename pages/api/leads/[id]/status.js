// pages/api/leads/[id]/status.js
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Scope the update to deliveries owned by this user
  const delivery = await db.leadDelivery.findFirst({ where: { id, userId: user.id } });
  if (!delivery) return res.status(404).json({ message: 'Lead not found' });

  await db.leadDelivery.update({ where: { id: delivery.id }, data: { status } });

  return res.status(200).json({ id: delivery.id, status });
}

export default withErrorHandler(handler);
