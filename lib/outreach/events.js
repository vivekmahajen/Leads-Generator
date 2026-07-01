// lib/outreach/events.js
// Shared reply/bounce/complaint processing — used by the ESP webhook
// (/api/outreach/inbound) and the Gmail poller. Idempotent via state checks.
import { db } from '@/lib/db';

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

// Resolve the originating OutreachMessage (+ enrollment) from a provider id or email.
async function resolveMessage({ providerMessageId, providerMessageIds, email }) {
  const ids = providerMessageIds || (providerMessageId ? [providerMessageId] : []);
  if (ids.length) {
    const m = await db.outreachMessage.findFirst({ where: { providerMessageId: { in: ids } }, include: { enrollment: { include: { lead: true } } } });
    if (m) return m;
  }
  if (email) {
    return db.outreachMessage.findFirst({ where: { toEmail: email.toLowerCase() }, orderBy: { createdAt: 'desc' }, include: { enrollment: { include: { lead: true } } } });
  }
  return null;
}

/**
 * Apply an outreach event. type: 'reply' | 'bounce' | 'complaint'.
 * @returns {{ matched: boolean, action?: string }}
 */
export async function processOutreachEvent(type, { providerMessageId, providerMessageIds, email } = {}) {
  const message = await resolveMessage({ providerMessageId, providerMessageIds, email });
  if (!message) return { matched: false };

  const en = message.enrollment;
  const userId = en.userId;
  const deliveryId = en.leadId;
  const addr = (email || message.toEmail || '').toLowerCase() || null;

  if (type === 'reply') {
    if (en.status !== 'replied') {
      await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'replied' } });
      await db.enrollment.update({ where: { id: en.id }, data: { status: 'replied', nextSendAt: null, claimedAt: null } });
      const delivery = await db.leadDelivery.findUnique({ where: { id: deliveryId } });
      if (delivery && ['new', 'contacted'].includes(delivery.status)) {
        await db.leadDelivery.update({ where: { id: deliveryId }, data: { status: 'qualified' } });
      }
    }
    return { matched: true, action: 'replied_stopped_qualified' };
  }

  if (type === 'bounce') {
    if (en.status !== 'bounced') {
      await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'bounced', error: 'hard bounce' } });
      await db.enrollment.update({ where: { id: en.id }, data: { status: 'bounced', nextSendAt: null, claimedAt: null } });
      await suppress(userId, addr, 'bounced');
      await db.leadDelivery.update({ where: { id: deliveryId }, data: { replacementRequested: true, status: 'rejected', rejectionReason: 'hard_bounce' } }).catch(() => {});
    }
    return { matched: true, action: 'bounced_suppressed_replacement' };
  }

  if (type === 'complaint') {
    await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'failed', error: 'spam complaint' } });
    await suppress(userId, addr, 'complained');
    await stopEnrollmentsForEmail(userId, addr, 'unsubscribed');
    return { matched: true, action: 'complaint_suppressed_stopped' };
  }

  return { matched: false };
}
