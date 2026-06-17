// pages/api/billing/webhook.js
// Stripe webhook handler — provisions subscriptions on checkout completion and
// keeps status in sync with Stripe lifecycle events.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

// Stripe requires the raw request body to verify the signature.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ message: 'Billing webhook not configured' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await provisionSubscription(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'cancelled',
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
            cancelledAt: sub.status === 'canceled' ? new Date() : undefined,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error:', err.message);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}

async function provisionSubscription(session) {
  const meta = session.metadata || {};
  const userId = meta.user_id;
  if (!userId) return;

  let categoryIds = [];
  try {
    categoryIds = JSON.parse(meta.category_ids || '[]');
  } catch {
    categoryIds = [];
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subscription = await db.subscription.create({
    data: {
      userId,
      tierId: meta.tier_id || 'starter',
      billingCycle: meta.billing_cycle || 'monthly',
      categoryCount: categoryIds.length,
      monthlyPrice: meta.monthly_price ? Number(meta.monthly_price) : null,
      status: 'active',
      stripeSubscriptionId: session.subscription || null,
      stripeCustomerId: session.customer || null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // Link the user's selected categories to this subscription
  await db.userCategory.updateMany({
    where: { userId },
    data: { subscriptionId: subscription.id, active: true },
  });
}

export default withErrorHandler(handler);
