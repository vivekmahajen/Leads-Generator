// pages/api/auth/login.js
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

// A valid bcrypt hash of random data — used for timing-safe comparison so the
// response time doesn't reveal whether an account exists.
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3K1l9lJ8VtkX5xQ8Z3Yk5pVxh1Q3l3K';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase().trim() },
        { phone: identifier.replace(/\D/g, '') },
      ],
    },
  });

  // Always run a compare to keep response timing constant.
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

  if (!user || !valid) {
    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password',
    });
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // Load active subscription + selected categories
  const subscription = await db.subscription.findFirst({
    where: { userId: user.id, status: 'active' },
    include: { categories: true },
    orderBy: { createdAt: 'desc' },
  });

  const token = signToken({ userId: user.id, email: user.email });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      company_name: user.companyName,
      email_verified: user.emailVerified,
    },
    subscription: subscription
      ? {
          tier: subscription.tierId,
          status: subscription.status,
          categories: subscription.categories.map((c) => c.categoryId),
          period_end: subscription.currentPeriodEnd,
        }
      : null,
  });
}
