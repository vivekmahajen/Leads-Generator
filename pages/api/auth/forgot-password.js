// pages/api/auth/forgot-password.js
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { sendPasswordResetOTP } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { email } = req.body || {};
  const normalizedEmail = email?.toLowerCase().trim();

  // Rate limit: 3 OTP requests per email per hour
  if (normalizedEmail) {
    const { allowed } = rateLimit(`otp:${normalizedEmail}`, 3, 60 * 60 * 1000);
    if (!allowed) {
      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many reset requests. Please try again later.',
      });
    }
  }

  // Always return 200 to prevent email enumeration
  const genericResponse = { message: 'If this email exists, an OTP has been sent' };

  if (!normalizedEmail) return res.status(200).json(genericResponse);

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.status(200).json(genericResponse);

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.passwordReset.create({
    data: { userId: user.id, otpCode: otp, expiresAt },
  });

  try {
    await sendPasswordResetOTP(user.email, user.fullName, otp);
  } catch (err) {
    console.error('[forgot-password] email send failed:', err.message);
  }

  return res.status(200).json(genericResponse);
}

export default withErrorHandler(handler);
