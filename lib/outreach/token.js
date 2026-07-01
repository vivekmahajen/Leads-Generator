// lib/outreach/token.js
// Tokenized, login-free unsubscribe links. HMAC-signed {user,email} so the
// one-click unsubscribe endpoint can trust the address without a session.
import crypto from 'crypto';

function secret() {
  return process.env.JWT_SECRET || 'dev-outreach-secret';
}

export function makeUnsubToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: String(email || '').toLowerCase() })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return { userId: data.u, email: data.e };
  } catch {
    return null;
  }
}
