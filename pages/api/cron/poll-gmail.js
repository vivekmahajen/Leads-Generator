// pages/api/cron/poll-gmail.js
// Restores the auto-status loop when sending via Gmail (which has no webhooks).
// Polls the Gmail inbox over IMAP, detects replies (In-Reply-To/References →
// our OutreachMessage) and bounces (mailer-daemon / DSN → failed recipient), and
// feeds them through the same event processor as the ESP webhook. Idempotent.
//
// vercel.json: { "path": "/api/cron/poll-gmail", "schedule": "*/15 * * * *" }
import { ImapFlow } from 'imapflow';
import { withErrorHandler } from '@/lib/apiHandler';
import { gmailConfigured } from '@/lib/outreach/sender';
import { processOutreachEvent } from '@/lib/outreach/events';
import { extractReferencedIds, idVariants, looksLikeBounce, extractEmails, isAutoReply } from '@/lib/outreach/gmailParse';

const LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 120;

async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!gmailConfigured()) {
    return res.status(200).json({ ok: true, skipped: 'gmail not configured' });
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    logger: false,
  });

  const summary = { scanned: 0, replies: 0, bounces: 0 };
  const gmailUser = (process.env.GMAIL_USER || '').toLowerCase();
  const cutoff = new Date(Date.now() - LOOKBACK_MS);

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const total = client.mailbox.exists || 0;
      if (!total) return res.status(200).json({ ok: true, ...summary });
      const start = Math.max(1, total - MAX_MESSAGES + 1);

      for await (const msg of client.fetch(`${start}:*`, { envelope: true, internalDate: true, source: true })) {
        if (msg.internalDate && msg.internalDate < cutoff) continue;
        summary.scanned += 1;
        const raw = msg.source ? msg.source.toString('utf8') : '';
        const headerBlock = raw.split(/\r?\n\r?\n/)[0] || raw;
        const from = (msg.envelope?.from?.[0]?.address || '').toLowerCase();
        const subject = msg.envelope?.subject || '';

        try {
          if (looksLikeBounce({ from, subject })) {
            // Find the failed recipient among addresses in the message.
            const candidates = extractEmails(raw).filter((e) => e !== gmailUser && !/mailer-daemon|postmaster|googlemail|google\.com$/.test(e));
            for (const email of candidates) {
              const r = await processOutreachEvent('bounce', { email });
              if (r.matched) { summary.bounces += 1; break; }
            }
            continue;
          }

          // Reply: match In-Reply-To / References to one of our sent message ids.
          const refIds = extractReferencedIds(headerBlock).flatMap(idVariants);
          if (refIds.length) {
            const r = await processOutreachEvent('reply', { providerMessageIds: refIds });
            if (r.matched) { summary.replies += 1; continue; }
          }
          // Fallback: a "Re:" from an address we messaged.
          if (from && isAutoReply(subject)) {
            const r = await processOutreachEvent('reply', { email: from });
            if (r.matched) summary.replies += 1;
          }
        } catch (err) {
          console.error('[poll-gmail] message error:', err.message);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    try { await client.close(); } catch { /* ignore */ }
    return res.status(502).json({ error: 'IMAP_ERROR', message: err.message });
  }

  return res.status(200).json({ ok: true, ...summary });
}

export default withErrorHandler(handler);
