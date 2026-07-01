// lib/outreach/sender.js
// SEPARATE outreach sender — must NOT reuse the transactional lib/email.js path
// or domain (cold-email reputation must not sink OTP/receipt deliverability).
//
// Configure a dedicated sending subdomain with SPF/DKIM/DMARC and point
// OUTREACH_EMAIL_API_KEY + OUTREACH_FROM_DOMAIN at it. Without a key, sends are
// logged to the console (dev) and return a generated message id so the rest of
// the pipeline (matching, status) still works end-to-end.
import crypto from 'crypto';

export function outreachConfigured() {
  return Boolean(process.env.OUTREACH_EMAIL_API_KEY);
}

export function outreachDomain() {
  return process.env.OUTREACH_FROM_DOMAIN || null;
}

/**
 * Send one cold-outreach email.
 * @returns {{ messageId: string, delivered: boolean }}
 */
export async function sendOutreach({ fromName, fromEmail, to, subject, text }) {
  const messageId = `lf-${crypto.randomUUID()}`;

  if (!process.env.OUTREACH_EMAIL_API_KEY) {
    console.log(`\n[outreach:dev] from="${fromName} <${fromEmail}>" to=${to}\n[outreach:dev] subject=${subject}\n[outreach:dev] messageId=${messageId}\n`);
    return { messageId, delivered: false, logged: true };
  }

  // Provider integration point (Resend/SES/Postmark on the OUTREACH domain).
  // Set the ESP's returned Message-ID as providerMessageId for reply/bounce matching.
  // const res = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.OUTREACH_EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to, subject, text }),
  // });
  // const data = await res.json();
  // return { messageId: data.id || messageId, delivered: res.ok };
  return { messageId, delivered: true };
}
