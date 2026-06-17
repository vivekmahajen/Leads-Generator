// pages/api/billing/create-checkout.js
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { calculatePrice } from '@/lib/pricing';
import { CATEGORY_MAP } from '@/lib/categories';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'BILLING_UNAVAILABLE', message: 'Billing is not configured' });
  }

  const { category_ids, billing_cycle = 'monthly', return_url } = req.body || {};
  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return res.status(400).json({ message: 'At least one category must be selected' });
  }
  const uniqueIds = [...new Set(category_ids)].filter((id) => CATEGORY_MAP[id]);
  if (!uniqueIds.length) return res.status(400).json({ message: 'No valid categories selected' });

  const pricing = calculatePrice(uniqueIds.length, billing_cycle);
  if (!pricing.tier) return res.status(400).json({ message: 'Invalid category count' });

  const baseUrl = return_url || `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`;

  // Create or retrieve the Stripe customer
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `LeadForge ${pricing.tier.label} Plan`,
            description: `${uniqueIds.length} categories · ${uniqueIds.length * 50}+ leads/month`,
          },
          unit_amount: Math.round(pricing.price * 100),
          recurring: { interval: billing_cycle === 'annual' ? 'year' : 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${baseUrl}?status=cancelled`,
    metadata: {
      user_id: user.id,
      category_ids: JSON.stringify(uniqueIds),
      tier_id: pricing.tier.id,
      billing_cycle,
      monthly_price: String(pricing.price),
    },
  });

  return res.status(200).json({ checkout_url: session.url });
}
