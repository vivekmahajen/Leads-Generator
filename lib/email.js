// lib/email.js
// Transactional email helpers.
//
// In production wire these to a provider (Resend / SES / Postmark). When no
// provider is configured (local dev / preview), emails are logged to the
// console so the flows remain fully testable without external services.

const FROM = process.env.EMAIL_FROM || 'LeadForge <no-reply@leadforge.io>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function deliver({ to, subject, text }) {
  // No provider configured → log and return (dev-friendly, never throws).
  if (!process.env.EMAIL_API_KEY) {
    console.log(`\n[email] from=${FROM} to=${to}\n[email] subject=${subject}\n[email] ${text}\n`);
    return { delivered: false, logged: true };
  }

  // Example provider hook (Resend-style). Left here as the integration point.
  // const res = await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ from: FROM, to, subject, text }),
  // });
  // return { delivered: res.ok };
  return { delivered: false, logged: true };
}

export async function sendVerificationEmail(email, fullName, token) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  return deliver({
    to: email,
    subject: 'Verify your LeadForge account',
    text: `Hi ${fullName},\n\nWelcome to LeadForge! Confirm your email to start receiving leads:\n${url}\n\nIf you didn't sign up, you can ignore this message.`,
  });
}

export async function sendWelcomeEmail(email, fullName) {
  return deliver({
    to: email,
    subject: 'Welcome to LeadForge 🎯',
    text: `Hi ${fullName},\n\nYour LeadForge account is ready. Pick your industry categories and your first batch of leads will arrive within 24 hours.`,
  });
}

export async function sendPasswordResetOTP(email, fullName, otp) {
  return deliver({
    to: email,
    subject: 'Your LeadForge password reset code',
    text: `Hi ${fullName},\n\nYour password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request it, ignore this email.`,
  });
}
