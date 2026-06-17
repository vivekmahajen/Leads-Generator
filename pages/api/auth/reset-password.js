// pages/api/auth/reset-password.js
import { withErrorHandler } from '@/lib/apiHandler';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { email, otp, new_password } = req.body || {};
  if (!email || !otp || !new_password) {
    return res.status(400).json({ message: 'Email, OTP and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({
      error: 'PASSWORD_TOO_SHORT',
      message: 'Password must be at least 8 characters',
    });
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return res.status(400).json({ message: 'Invalid request' });

  // Find a valid, unused, unexpired OTP
  const resetRecord = await db.passwordReset.findFirst({
    where: {
      userId: user.id,
      otpCode: otp,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!resetRecord) {
    return res.status(400).json({
      error: 'INVALID_OTP',
      message: 'Invalid or expired OTP. Please request a new one.',
    });
  }

  // Mark OTP used + update password atomically
  const newHash = await bcrypt.hash(new_password, 12);
  await db.$transaction([
    db.passwordReset.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
  ]);

  return res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
}

export default withErrorHandler(handler);
