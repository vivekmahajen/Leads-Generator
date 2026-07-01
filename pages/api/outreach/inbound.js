// pages/api/outreach/inbound.js
// Reply / bounce / complaint webhook → auto-update lead status + suppression +
// replacement. Point your ESP's event webhook here.
//
// Normalized body: { type: 'reply'|'bounce'|'complaint', provider_message_id?, email? }
// (Common ESP field names are also accepted.) Optional shared secret via
// ?secret= or X-Webhook-Secret when OUTREACH_WEBHOOK_SECRET is set.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';

function normalizeType(b) {
  const t = String(b.type || b.event || b.eventType || '').toLowerCase();
  if (/reply|inbound|response/.test(t)) return 'reply';
  if (/complaint|spam|abuse/.test(t)) return 'complaint';
  if (/bounce|failed|undeliver|dropped/.test(t)) return 'bounce';
  return t || null;
}

async function suppress(userId, email, reason) {
  if (!email) return;
  await db.suppression.upsert({
    where: { userId_email: { userId, email: email.toLowerCase() } },
    update: { reason },
    create: { userId, email: email.toLowerCase(), reason },
  });
}

async function stopEnrollmentsForEmail(userId, email, status) {
  await db.enrollment.updateMany({
    where: { userId, status: { in: ['active', 'paused'] }, lead: { lead: { email } } },
    data: { status, nextSendAt: null, claimedAt: null },
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const secret = process.env.OUTREACH_WEBHOOK_SECRET;
  if (secret && (req.query.secret || req.headers['x-webhook-secret']) !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const b = req.body || {};
  const type = normalizeType(b);
  const providerMessageId = b.provider_message_id || b.messageId || b.message_id || b['message-id'] || null;
  let email = (b.email || b.recipient || b.from || '').toLowerCase() || null;

  // Resolve the enrollment + owner from the message id (preferred) or email.
  let message = null;
  if (providerMessageId) {
    message = await db.outreachMessage.findUnique({ where: { providerMessageId }, include: { enrollment: { include: { lead: true } } } });
  }
  if (!message && email) {
    message = await db.outreachMessage.findFirst({ where: { toEmail: email }, orderBy: { createdAt: 'desc' }, include: { enrollment: { include: { lead: true } } } });
  }
  if (!message) return res.status(202).json({ ok: true, matched: false });

  const en = message.enrollment;
  const userId = en.userId;
  const deliveryId = en.leadId;
  email = email || message.toEmail;

  if (type === 'reply') {
    await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'replied' } });
    await db.enrollment.update({ where: { id: en.id }, data: { status: 'replied', nextSendAt: null, claimedAt: null } });
    // contacted → qualified (don't downgrade a converted/qualified lead).
    const delivery = await db.leadDelivery.findUnique({ where: { id: deliveryId } });
    if (delivery && ['new', 'contacted'].includes(delivery.status)) {
      await db.leadDelivery.update({ where: { id: deliveryId }, data: { status: 'qualified' } });
    }
    return res.status(200).json({ ok: true, action: 'replied_stopped_qualified' });
  }

  if (type === 'bounce') {
    await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'bounced', error: 'hard bounce' } });
    await db.enrollment.update({ where: { id: en.id }, data: { status: 'bounced', nextSendAt: null, claimedAt: null } });
    await suppress(userId, email, 'bounced');
    // A bounced lead is a bad lead → flag for replacement (guarantee).
    await db.leadDelivery.update({ where: { id: deliveryId }, data: { replacementRequested: true, status: 'rejected', rejectionReason: 'hard_bounce' } }).catch(() => {});
    return res.status(200).json({ ok: true, action: 'bounced_suppressed_replacement' });
  }

  if (type === 'complaint') {
    await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'failed', error: 'spam complaint' } });
    await suppress(userId, email, 'complained');
    await stopEnrollmentsForEmail(userId, email, 'unsubscribed');
    return res.status(200).json({ ok: true, action: 'complaint_suppressed_stopped' });
  }

  return res.status(400).json({ message: `Unknown event type: ${type}` });
}

export default withErrorHandler(handler);
