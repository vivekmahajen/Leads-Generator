// pages/api/auth/signup.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { email, phone, full_name, company_name, company_size, role, password } = req.body || {};

  // Validate required fields
  if (!email || !full_name || !password) {
    return res.status(400).json({
      error: 'NAME_EMAIL_PASSWORD_REQUIRED',
      message: 'Full name, email and password are required',
    });
  }
  if (password.length < 8) {
    return res.status(400).json({
      error: 'PASSWORD_TOO_SHORT',
      message: 'Password must be at least 8 characters',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone ? phone.replace(/\D/g, '') : null;

  // Check for existing user (by email or phone)
  const existing = await db.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    },
  });
  if (existing) {
    return res.status(409).json({
      error: 'USER_EXISTS',
      message: 'An account with this email already exists. Try logging in instead.',
    });
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomUUID();

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      phone: normalizedPhone,
      fullName: full_name,
      companyName: company_name || null,
      companySize: company_size || null,
      role: role || null,
      passwordHash,
      emailVerifyToken: verifyToken,
    },
  });

  // Fire-and-forget emails (never block signup on email delivery)
  try {
    await sendVerificationEmail(normalizedEmail, full_name, verifyToken);
    await sendWelcomeEmail(normalizedEmail, full_name);
  } catch (err) {
    console.error('[signup] email send failed:', err.message);
  }

  const token = signToken({ userId: user.id, email: normalizedEmail });

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      company_name: user.companyName,
      email_verified: user.emailVerified,
    },
  });
}
