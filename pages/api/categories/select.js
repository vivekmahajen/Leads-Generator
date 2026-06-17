// pages/api/categories/select.js
// Update the user's selected categories + recalculate pricing for checkout.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { calculatePrice } from '@/lib/pricing';
import { CATEGORY_MAP } from '@/lib/categories';

async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { category_ids, billing_cycle = 'monthly' } = req.body || {};
  if (!Array.isArray(category_ids) || category_ids.length === 0) {
    return res.status(400).json({ message: 'At least one category must be selected' });
  }

  // Validate that every id is a real category
  const invalid = category_ids.filter((id) => !CATEGORY_MAP[id]);
  if (invalid.length) {
    return res.status(400).json({ message: `Unknown categories: ${invalid.join(', ')}` });
  }
  const uniqueIds = [...new Set(category_ids)];

  const count = uniqueIds.length;
  const pricing = calculatePrice(count, billing_cycle);
  if (!pricing.tier) return res.status(400).json({ message: 'Invalid category count' });

  // Persist selection (replace existing). Pending until checkout completes.
  await db.$transaction([
    db.userCategory.deleteMany({ where: { userId: user.id } }),
    db.userCategory.createMany({
      data: uniqueIds.map((id) => ({ userId: user.id, categoryId: id })),
    }),
  ]);

  return res.status(200).json({
    category_count: count,
    pricing: {
      tier: pricing.tier.id,
      tier_label: pricing.tier.label,
      monthly_price: pricing.price,
      discount_pct: pricing.discount,
      per_category: pricing.perCat,
      billing_cycle,
      annual_savings: billing_cycle === 'annual' ? pricing.savings : null,
    },
  });
}

export default withErrorHandler(handler);
