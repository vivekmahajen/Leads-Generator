import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, PRICING_TIERS, MAX_CAT_DISCOUNT } from '../lib/pricing.js';

test('zero / invalid counts return an empty price', () => {
  for (const n of [0, -1, null, undefined]) {
    const p = calculatePrice(n);
    assert.equal(p.price, 0);
    assert.equal(p.tier, null);
  }
});

test('selects the correct tier by category count', () => {
  assert.equal(calculatePrice(1).tier.id, 'starter');
  assert.equal(calculatePrice(3).tier.id, 'starter');
  assert.equal(calculatePrice(4).tier.id, 'growth');
  assert.equal(calculatePrice(8).tier.id, 'growth');
  assert.equal(calculatePrice(9).tier.id, 'pro');
  assert.equal(calculatePrice(15).tier.id, 'pro');
  assert.equal(calculatePrice(16).tier.id, 'enterprise');
  assert.equal(calculatePrice(28).tier.id, 'enterprise');
});

test('counts beyond the max fall back to enterprise', () => {
  assert.equal(calculatePrice(40).tier.id, 'enterprise');
});

// Regression values — computed from the pricing formula (source of truth).
test('monthly prices match the pricing formula', () => {
  const expected = { 1: 49, 3: 81, 4: 73, 8: 117, 10: 118, 16: 149, 28: 199 };
  for (const [count, price] of Object.entries(expected)) {
    assert.equal(calculatePrice(Number(count), 'monthly').price, price, `count=${count}`);
  }
});

test('annual is always cheaper than monthly (20% off)', () => {
  for (let n = 1; n <= 28; n++) {
    const m = calculatePrice(n, 'monthly');
    const a = calculatePrice(n, 'annual');
    assert.ok(a.price <= m.price, `count=${n}: annual ${a.price} > monthly ${m.price}`);
    assert.equal(a.price, Math.round(m.price * 0.8));
  }
});

test('combined discount never exceeds the 40% cap', () => {
  for (let n = 1; n <= 28; n++) {
    assert.ok(calculatePrice(n).discount <= MAX_CAT_DISCOUNT * 100, `count=${n}`);
  }
});

test('discount is monotonic non-decreasing within a tier as cats grow', () => {
  for (const tier of PRICING_TIERS) {
    let prev = -1;
    for (let n = tier.minCats; n <= tier.maxCats; n++) {
      const d = calculatePrice(n).discount;
      assert.ok(d >= prev, `tier=${tier.id} count=${n}`);
      prev = d;
    }
  }
});

test('per-category price is reported', () => {
  const p = calculatePrice(10, 'monthly');
  assert.equal(p.perCat, Math.round(p.price / 10));
});
