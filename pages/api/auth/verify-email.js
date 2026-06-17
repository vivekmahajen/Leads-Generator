// pages/api/auth/verify-email.js
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';

async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.body?.token || req.query?.token;
  if (!token) return res.status(400).json({ message: 'Verification token is required' });

  const user = await db.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) {
    return res.status(400).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired verification link' });
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null },
  });

  return res.status(200).json({ message: 'Email verified successfully' });
}

export default withErrorHandler(handler);
