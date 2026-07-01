// pages/api/outreach/suppressions.js — view (GET) + manually add (POST) suppressions.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const suppressions = await db.suppression.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 500 });
    return res.status(200).json({ suppressions });
  }

  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email?.trim()) return res.status(400).json({ message: 'email is required' });
    const s = await db.suppression.upsert({
      where: { userId_email: { userId: user.id, email: email.toLowerCase().trim() } },
      update: { reason: 'manual' },
      create: { userId: user.id, email: email.toLowerCase().trim(), reason: 'manual' },
    });
    // Stop any active sequences for this address too.
    await db.enrollment.updateMany({
      where: { userId: user.id, status: { in: ['active', 'paused'] }, lead: { lead: { email: email.toLowerCase().trim() } } },
      data: { status: 'unsubscribed', nextSendAt: null, claimedAt: null },
    });
    return res.status(201).json({ suppression: s });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withErrorHandler(handler);
