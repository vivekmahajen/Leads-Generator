// pages/api/outreach/inbound.js
// ESP reply / bounce / complaint webhook → auto lead-status + suppression +
// replacement (shared logic in lib/outreach/events). Point your ESP's event
// webhook here. Optional shared secret via ?secret= or X-Webhook-Secret.
//
// Normalized body: { type: 'reply'|'bounce'|'complaint', provider_message_id?, email? }
import { withErrorHandler } from '@/lib/apiHandler';
import { processOutreachEvent } from '@/lib/outreach/events';

function normalizeType(b) {
  const t = String(b.type || b.event || b.eventType || '').toLowerCase();
  if (/reply|inbound|response/.test(t)) return 'reply';
  if (/complaint|spam|abuse/.test(t)) return 'complaint';
  if (/bounce|failed|undeliver|dropped/.test(t)) return 'bounce';
  return t || null;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const secret = process.env.OUTREACH_WEBHOOK_SECRET;
  if (secret && (req.query.secret || req.headers['x-webhook-secret']) !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const b = req.body || {};
  const type = normalizeType(b);
  if (!type) return res.status(400).json({ message: 'Unknown event type' });

  const providerMessageId = b.provider_message_id || b.messageId || b.message_id || b['message-id'] || null;
  const email = (b.email || b.recipient || b.from || '').toLowerCase() || null;

  const result = await processOutreachEvent(type, { providerMessageId, email });
  return res.status(result.matched ? 200 : 202).json({ ok: true, ...result });
}

export default withErrorHandler(handler);
