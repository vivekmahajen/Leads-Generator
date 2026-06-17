// lib/stripe.js
// Stripe client singleton. Lazily instantiated so the app boots even without
// a key configured (the billing routes will surface a clear error instead).

import Stripe from 'stripe';

let _stripe = null;

export function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  return _stripe;
}

export const stripe = getStripe();
