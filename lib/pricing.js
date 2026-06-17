// lib/pricing.js
// Real-time pricing engine — price adjusts as categories are added/removed

export const PRICING_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    minCats: 1,
    maxCats: 3,
    basePrice: 49,     // $/month
    pricePerExtraCat: 18,
    volumeDiscount: 0,
    badge: null,
    color: '#6b7280',
    leadsPerMonth: '50–300',
    features: [
      'Email-verified leads',
      'Basic qualification filters',
      'CSV export',
      'Weekly lead delivery',
      'Email support',
      '7-day lead replacement guarantee',
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    minCats: 4,
    maxCats: 8,
    basePrice: 79,
    pricePerExtraCat: 16,
    volumeDiscount: 0.08,  // 8% discount
    badge: 'Most Popular',
    color: '#6366f1',
    leadsPerMonth: '300–900',
    features: [
      'Phone + email verified leads',
      'Advanced qualification filters',
      'CRM integration (HubSpot, Salesforce, Zoho)',
      'Real-time lead delivery (webhook)',
      'Lead quality score (AI)',
      'Priority email support',
      '14-day lead replacement guarantee',
      'Custom lead fields',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    minCats: 9,
    maxCats: 15,
    basePrice: 129,
    pricePerExtraCat: 14,
    volumeDiscount: 0.15,  // 15% discount
    badge: 'Best for Agencies',
    color: '#0ea5e9',
    leadsPerMonth: '900–2,000',
    features: [
      'Full lead enrichment (LinkedIn, company data)',
      'Intent scoring (buying signal strength)',
      'Deduplication across all sources',
      'API access (REST + webhooks)',
      'White-label lead reports',
      'Dedicated account manager',
      '21-day lead replacement guarantee',
      'A/B filter testing',
      'Multi-user team access (5 seats)',
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    minCats: 16,
    maxCats: 28,
    basePrice: 199,
    pricePerExtraCat: 11,
    volumeDiscount: 0.25,  // 25% discount
    badge: 'Maximum Scale',
    color: '#10b981',
    leadsPerMonth: '2,000+',
    features: [
      'Everything in Pro',
      'Custom data enrichment fields',
      'Dedicated lead sourcing team',
      'SLA guarantee (uptime + volume)',
      'White-label reseller option',
      'Custom integrations on request',
      '30-day lead replacement guarantee',
      'Unlimited team seats',
      'Quarterly business review',
      'Custom category creation',
    ],
  },
];

// Annual billing discount on top of volume discount
export const ANNUAL_DISCOUNT = 0.20;  // 20% off monthly price

// Per-category incremental discount
// Each additional category beyond tier minimum gets 2.5% extra discount (up to 40% max)
export const CAT_INCREMENTAL_DISCOUNT = 0.025;
export const MAX_CAT_DISCOUNT = 0.40;

/**
 * Calculate real-time price based on selected category count and billing cycle
 *
 * @param {number} count - Number of selected categories
 * @param {'monthly'|'annual'} cycle - Billing cycle
 * @returns {Object} - Pricing breakdown
 */
export function calculatePrice(count, cycle = 'monthly') {
  if (!count || count <= 0) return { price: 0, tier: null, savings: 0, perCat: 0, discount: 0, rawPrice: 0 };

  // Find the right tier
  const tier = PRICING_TIERS.find(t => count >= t.minCats && count <= t.maxCats)
    || PRICING_TIERS[PRICING_TIERS.length - 1];

  // Base + per-extra-category price
  const extraCats = Math.max(0, count - tier.minCats);
  const rawPrice = tier.basePrice + (extraCats * tier.pricePerExtraCat);

  // Volume discount for this tier
  const tierDiscount = tier.volumeDiscount;

  // Incremental cat discount (2.5% per extra cat beyond tier min, max 40%)
  const catDiscount = Math.min(MAX_CAT_DISCOUNT, extraCats * CAT_INCREMENTAL_DISCOUNT);

  // Combined discount (tier discount + cat discount, capped at 40%)
  const combinedDiscount = Math.min(MAX_CAT_DISCOUNT, tierDiscount + catDiscount);

  const monthlyPrice = Math.round(rawPrice * (1 - combinedDiscount));
  const annualMonthlyPrice = Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT));

  const price = cycle === 'annual' ? annualMonthlyPrice : monthlyPrice;
  const savings = cycle === 'annual'
    ? Math.round((monthlyPrice - annualMonthlyPrice) * 12)
    : Math.round(rawPrice - monthlyPrice);

  return {
    price,
    monthlyPrice,
    annualMonthlyPrice,
    tier,
    discount: Math.round(combinedDiscount * 100),
    savings,
    perCat: Math.round(price / count),
    rawPrice: Math.round(rawPrice),
  };
}
