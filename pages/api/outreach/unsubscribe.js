// pages/api/outreach/unsubscribe.js
// One-click, login-free, tokenized unsubscribe (CAN-SPAM). Adds a suppression
// and immediately halts every sequence for that address. Handles GET (link
// click) and POST (RFC 8058 List-Unsubscribe-Post).
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { verifyUnsubToken } from '@/lib/outreach/token';

async function unsubscribe(token) {
  const data = verifyUnsubToken(token);
  if (!data?.userId || !data?.email) return false;
  const { userId, email } = data;

  await db.suppression.upsert({
    where: { userId_email: { userId, email: email.toLowerCase() } },
    update: { reason: 'unsubscribed' },
    create: { userId, email: email.toLowerCase(), reason: 'unsubscribed' },
  });
  await db.enrollment.updateMany({
    where: { userId, status: { in: ['active', 'paused'] }, lead: { lead: { email } } },
    data: { status: 'unsubscribed', nextSendAt: null, claimedAt: null },
  });
  return true;
}

async function handler(req, res) {
  const token = req.query.token || req.body?.token;
  const ok = await unsubscribe(token);

  if (req.method === 'POST') {
    return res.status(ok ? 200 : 400).json({ ok });
  }

  // GET → simple confirmation page.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const msg = ok
    ? '<h2>You’re unsubscribed</h2><p>You will not receive further emails from this sender.</p>'
    : '<h2>Invalid or expired link</h2><p>We couldn’t process this unsubscribe request.</p>';
  return res.status(ok ? 200 : 400).send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><style>body{font-family:system-ui;background:#0a0d14;color:#f0f4ff;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:20px}</style></head><body><div>${msg}</div></body></html>`);
}

export const config = { api: { bodyParser: true } };
export default withErrorHandler(handler);
