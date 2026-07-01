// pages/api/sequences/[id].js — get / activate|archive / delete a sequence.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.query;

  const seq = await db.sequence.findFirst({ where: { id, userId: user.id }, include: { steps: { orderBy: { stepOrder: 'asc' } } } });
  if (!seq) return res.status(404).json({ message: 'Sequence not found' });

  if (req.method === 'GET') return res.status(200).json({ sequence: seq });

  if (req.method === 'PATCH') {
    const { status } = req.body || {};
    if (status && !['draft', 'active', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await db.sequence.update({ where: { id: seq.id }, data: { status: status || seq.status } });
    return res.status(200).json({ sequence: updated });
  }

  if (req.method === 'DELETE') {
    await db.sequence.update({ where: { id: seq.id }, data: { status: 'archived' } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withErrorHandler(handler);
