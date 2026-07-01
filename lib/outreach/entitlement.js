// lib/outreach/entitlement.js
// Plan-gated monthly send allowance + daily throttle, aligned with the
// subscription tiers. No active subscription → a small free allowance so the
// feature is usable, but metered.
import { db } from '@/lib/db';

const TIER_MONTHLY = { starter: 500, growth: 2000, pro: 8000, enterprise: 25000 };
const FREE_MONTHLY = 200;
const BASE_DAILY_CAP = 200; // gentle default; ramp/warmup can scale this later

function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}
function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function outreachEntitlement(userId) {
  const sub = await db.subscription.findFirst({ where: { userId, status: 'active' }, orderBy: { createdAt: 'desc' } });
  const monthly = sub ? (TIER_MONTHLY[sub.tierId] ?? FREE_MONTHLY) : FREE_MONTHLY;

  const [usedMonth, usedToday] = await Promise.all([
    db.outreachMessage.count({ where: { userId, status: 'sent', sentAt: { gte: startOfMonth() } } }),
    db.outreachMessage.count({ where: { userId, status: 'sent', sentAt: { gte: startOfDay() } } }),
  ]);

  const dailyCap = Math.min(BASE_DAILY_CAP, monthly);
  return {
    tier: sub?.tierId || 'free',
    monthly,
    usedMonth,
    remainingMonth: Math.max(0, monthly - usedMonth),
    dailyCap,
    usedToday,
    remainingToday: Math.max(0, dailyCap - usedToday),
  };
}
