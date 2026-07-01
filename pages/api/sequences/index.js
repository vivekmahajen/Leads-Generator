// pages/api/sequences/index.js — list (GET) + create (POST) sequences.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { outreachDomain } from '@/lib/outreach/sender';
import { outreachEntitlement } from '@/lib/outreach/entitlement';

async function handler(req, res) {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const sequences = await db.sequence.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, _count: { select: { enrollments: true } } },
    });

    // Per-sequence message outcome counts.
    const withStats = await Promise.all(sequences.map(async (s) => {
      const msgs = await db.outreachMessage.groupBy({
        by: ['status'],
        where: { enrollment: { sequenceId: s.id } },
        _count: true,
      });
      const stats = Object.fromEntries(msgs.map((m) => [m.status, m._count]));
      return { ...s, enrollments: s._count.enrollments, stats };
    }));

    const entitlement = await outreachEntitlement(user.id);
    return res.status(200).json({ sequences: withStats, outreach_domain: outreachDomain(), entitlement });
  }

  if (req.method === 'POST') {
    const { name, from_name, from_email, footer_address, region, steps } = req.body || {};
    if (!name || !from_name || !from_email) {
      return res.status(400).json({ message: 'name, from_name and from_email are required' });
    }
    if (!footer_address?.trim()) {
      return res.status(400).json({ message: 'A physical mailing address is required (CAN-SPAM).' });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'At least one step is required' });
    }

    const domain = outreachDomain();
    if (domain && !String(from_email).toLowerCase().endsWith(`@${domain.toLowerCase()}`) && !String(from_email).toLowerCase().includes(`.${domain.toLowerCase()}`)) {
      return res.status(400).json({ message: `from_email must be on the outreach domain (${domain}), not the app's transactional domain.` });
    }

    const seq = await db.sequence.create({
      data: {
        userId: user.id,
        name: name.trim(),
        fromName: from_name.trim(),
        fromEmail: from_email.trim(),
        footerAddress: footer_address.trim(),
        region: region || 'US',
        status: 'draft',
        steps: {
          create: steps.map((s, i) => ({
            stepOrder: i,
            delayHours: Math.max(0, parseInt(s.delay_hours, 10) || 0),
            subject: String(s.subject || '').trim(),
            body: String(s.body || '').trim(),
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    return res.status(201).json({ sequence: seq });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withErrorHandler(handler);
