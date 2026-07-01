// pages/api/cron/send-sequences.js
// Vercel Cron entrypoint — the send scheduler. Guarded by CRON_SECRET.
// vercel.json: { "crons": [{ "path": "/api/cron/send-sequences", "schedule": "*/5 * * * *" }] }
//
// For each due active enrollment: suppression → deliverable → cap → business
// hours guards, then render (+ unsubscribe/footer), send via the OUTREACH
// sender, advance the step, and move the lead new → contacted on first send.
// Idempotent: claims enrollments with a lock so overlapping runs don't double-send.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { renderTemplate, withComplianceFooter } from '@/lib/outreach/render';
import { makeUnsubToken } from '@/lib/outreach/token';
import { sendOutreach } from '@/lib/outreach/sender';
import { isSuppressed, ensureDeliverable } from '@/lib/outreach/guards';
import { outreachEntitlement } from '@/lib/outreach/entitlement';

const BATCH = 100; // cap work per invocation (serverless time limit)
const CLAIM_STALE_MS = 5 * 60 * 1000;

function withinBusinessHours(now = new Date()) {
  if (process.env.OUTREACH_ENFORCE_HOURS === '0') return true;
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const hour = now.getUTCHours();
  if (day === 0 || day === 6) return false;
  return hour >= 8 && hour < 20;
}

async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const businessHours = withinBusinessHours(now);

  const candidates = await db.enrollment.findMany({
    where: {
      status: 'active',
      nextSendAt: { lte: now },
      OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - CLAIM_STALE_MS) } }],
    },
    orderBy: { nextSendAt: 'asc' },
    take: BATCH,
    include: { sequence: { include: { steps: { orderBy: { stepOrder: 'asc' } } } }, lead: { include: { lead: true } } },
  });

  const entitlementCache = new Map();
  const summary = { processed: 0, sent: 0, skipped: 0, stopped: 0 };

  for (const en of candidates) {
    // Claim (optimistic lock) — skip if another run grabbed it.
    const claim = await db.enrollment.updateMany({
      where: { id: en.id, status: 'active', OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - CLAIM_STALE_MS) } }] },
      data: { claimedAt: now },
    });
    if (claim.count !== 1) continue;
    summary.processed += 1;

    try {
      const seq = en.sequence;
      const lead = en.lead?.lead; // enrollment.lead is LeadDelivery; .lead is Lead
      const delivery = en.lead;
      if (!seq || !lead || !delivery) { await stop(en.id, 'completed'); continue; }

      const step = seq.steps[en.currentStep];
      if (!step) { await stop(en.id, 'completed'); summary.stopped += 1; continue; }

      // Guard: suppression (checked at send time, not enroll time).
      if (await isSuppressed(seq.userId, lead.email)) {
        await stop(en.id, 'unsubscribed'); summary.stopped += 1; continue;
      }

      // Guard: business hours → reschedule to next morning.
      if (!businessHours) { await reschedule(en.id, hoursFromNow(12)); summary.skipped += 1; continue; }

      // Guard: caps.
      let ent = entitlementCache.get(seq.userId);
      if (!ent) { ent = await outreachEntitlement(seq.userId); entitlementCache.set(seq.userId, ent); }
      if (ent.remainingToday <= 0 || ent.remainingMonth <= 0) { await reschedule(en.id, hoursFromNow(24)); summary.skipped += 1; continue; }

      // Guard: deliverability.
      const deliverable = await ensureDeliverable(lead);
      if (!deliverable) {
        await db.outreachMessage.create({ data: { enrollmentId: en.id, userId: seq.userId, stepOrder: en.currentStep, status: 'failed', toEmail: lead.email, error: 'undeliverable (no MX)' } });
        await stop(en.id, 'paused'); summary.skipped += 1; continue;
      }

      // Render + mandatory compliance footer.
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/outreach/unsubscribe?token=${makeUnsubToken(seq.userId, lead.email)}`;
      const subject = renderTemplate(step.subject, lead);
      const body = withComplianceFooter(renderTemplate(step.body, lead), { fromName: seq.fromName, footerAddress: seq.footerAddress, unsubscribeUrl });

      const msg = await db.outreachMessage.create({ data: { enrollmentId: en.id, userId: seq.userId, stepOrder: en.currentStep, status: 'queued', toEmail: lead.email } });
      const sent = await sendOutreach({ fromName: seq.fromName, fromEmail: seq.fromEmail, to: lead.email, subject, text: body });
      await db.outreachMessage.update({ where: { id: msg.id }, data: { status: 'sent', providerMessageId: sent.messageId, sentAt: new Date() } });
      summary.sent += 1;
      ent.usedToday += 1; ent.remainingToday -= 1; ent.remainingMonth -= 1;

      // First touch → move the lead new → contacted.
      if (delivery.status === 'new') {
        await db.leadDelivery.update({ where: { id: delivery.id }, data: { status: 'contacted' } });
      }

      // Advance or complete.
      const nextIndex = en.currentStep + 1;
      if (nextIndex < seq.steps.length) {
        await db.enrollment.update({ where: { id: en.id }, data: { currentStep: nextIndex, nextSendAt: hoursFromNow(seq.steps[nextIndex].delayHours || 0), claimedAt: null } });
      } else {
        await stop(en.id, 'completed');
      }
    } catch (err) {
      console.error('[send-sequences] enrollment error:', en.id, err.message);
      await db.enrollment.update({ where: { id: en.id }, data: { claimedAt: null } }).catch(() => {});
    }
  }

  return res.status(200).json({ ok: true, ranAt: now.toISOString(), businessHours, ...summary });
}

function hoursFromNow(h) { return new Date(Date.now() + h * 3600 * 1000); }
async function stop(id, status) { await db.enrollment.update({ where: { id }, data: { status, nextSendAt: null, claimedAt: null } }); }
async function reschedule(id, when) { await db.enrollment.update({ where: { id }, data: { nextSendAt: when, claimedAt: null } }); }

export default withErrorHandler(handler);
