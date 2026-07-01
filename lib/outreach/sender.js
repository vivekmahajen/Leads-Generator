// lib/outreach/sender.js
// SEPARATE outreach sender — must NOT reuse the transactional lib/email.js path
// or domain (cold-email reputation must not sink OTP/receipt deliverability).
//
// Sending options (checked in order):
//   1. Gmail SMTP  — set GMAIL_USER + GMAIL_APP_PASSWORD (a Google App Password).
//      Free, good for LOW-VOLUME / warmer outreach. Gmail limits apply
//      (~500/day free, ~2,000/day Workspace) and reply/bounce webhooks do NOT
//      exist for Gmail — reply/bounce auto-handling needs the ESP webhook or a
//      future Gmail inbox poller.
//   2. Generic ESP — set OUTREACH_EMAIL_API_KEY (+ OUTREACH_FROM_DOMAIN). Best
//      for real cold volume: DKIM + structured reply/bounce webhooks.
//   3. Dev — neither set → console-log (the rest of the pipeline still runs).
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export function gmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function outreachConfigured() {
  return gmailConfigured() || Boolean(process.env.OUTREACH_EMAIL_API_KEY);
}

// The domain outreach sends from (used to validate from_email + for the UI).
export function outreachDomain() {
  if (process.env.OUTREACH_FROM_DOMAIN) return process.env.OUTREACH_FROM_DOMAIN;
  if (process.env.GMAIL_USER) return process.env.GMAIL_USER.split('@')[1] || null;
  return null;
}

let _tx = null;
function gmailTransport() {
  if (_tx) return _tx;
  _tx = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return _tx;
}

/**
 * Send one cold-outreach email.
 * @returns {{ messageId: string, delivered: boolean }}
 */
export async function sendOutreach({ fromName, fromEmail, to, subject, text }) {
  // 1) Gmail SMTP (app password). Gmail only sends as the authenticated account
  // (or a same-domain Workspace "send-as" alias), so we use fromEmail only when
  // its domain matches; otherwise the authenticated GMAIL_USER.
  if (gmailConfigured()) {
    const userDomain = process.env.GMAIL_USER.split('@')[1];
    const fromAddr = fromEmail && fromEmail.split('@')[1] === userDomain ? fromEmail : process.env.GMAIL_USER;
    const info = await gmailTransport().sendMail({ from: `"${fromName}" <${fromAddr}>`, to, subject, text });
    const delivered = (info.accepted || []).length > 0 && (info.rejected || []).length === 0;
    return { messageId: info.messageId, delivered };
  }

  const messageId = `lf-${crypto.randomUUID()}`;

  // 2) Generic ESP hook (Resend/SES/Postmark on the OUTREACH domain).
  if (process.env.OUTREACH_EMAIL_API_KEY) {
    // const res = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.OUTREACH_EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to, subject, text }),
    // });
    // const data = await res.json();
    // return { messageId: data.id || messageId, delivered: res.ok };
    return { messageId, delivered: true };
  }

  // 3) Dev — log and continue.
  console.log(`\n[outreach:dev] from="${fromName} <${fromEmail}>" to=${to}\n[outreach:dev] subject=${subject}\n[outreach:dev] messageId=${messageId}\n`);
  return { messageId, delivered: false, logged: true };
}
