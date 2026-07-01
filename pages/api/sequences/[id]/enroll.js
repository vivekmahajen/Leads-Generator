// pages/api/sequences/[id]/enroll.js
// Enroll dashboard leads into a sequence. Only verified/deliverable,
// non-suppressed, non-restricted-region leads are enrolled; others are skipped
// with a reason. No double-enrollment.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { enrollableEmail, isSuppressed, isRestrictedRegion, regionOf } from '@/lib/outreach/guards';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { lead_ids } = req.body || {};
  if (!Array.isArray(lead_ids) || !lead_ids.length) {
    return res.status(400).json({ message: 'lead_ids is required' });
  }

  const seq = await db.sequence.findFirst({ where: { id, userId: user.id }, include: { steps: { orderBy: { stepOrder: 'asc' } } } });
  if (!seq) return res.status(404).json({ message: 'Sequence not found' });
  if (!seq.steps.length) return res.status(400).json({ message: 'Sequence has no steps' });

  const firstDelay = seq.steps[0].delayHours || 0;
  const deliveries = await db.leadDelivery.findMany({
    where: { id: { in: lead_ids }, userId: user.id },
    include: { lead: true },
  });

  let enrolled = 0;
  const skipped = [];

  for (const d of deliveries) {
    const lead = d.lead || {};
    const emailCheck = enrollableEmail(lead);
    if (!emailCheck.ok) { skipped.push({ lead_id: d.id, reason: emailCheck.reason }); continue; }
    if (isRestrictedRegion(lead)) { skipped.push({ lead_id: d.id, reason: `restricted region (${regionOf(lead)}) — no opt-out basis` }); continue; }
    if (await isSuppressed(user.id, lead.email)) { skipped.push({ lead_id: d.id, reason: 'suppressed (unsubscribed/bounced)' }); continue; }

    try {
      await db.enrollment.create({
        data: {
          userId: user.id,
          leadId: d.id,
          sequenceId: seq.id,
          status: 'active',
          currentStep: 0,
          nextSendAt: new Date(Date.now() + firstDelay * 3600 * 1000),
        },
      });
      enrolled += 1;
    } catch (err) {
      if (err.code === 'P2002') skipped.push({ lead_id: d.id, reason: 'already enrolled' });
      else throw err;
    }
  }

  // Activate the sequence on first enrollment.
  if (enrolled && seq.status === 'draft') {
    await db.sequence.update({ where: { id: seq.id }, data: { status: 'active' } });
  }

  return res.status(200).json({ enrolled, skipped });
}

export default withErrorHandler(handler);
