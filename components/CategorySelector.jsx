'use client';
import { useState, useCallback, useEffect } from 'react';
import { CATEGORIES, TIERS } from '@/lib/categories';
import { calculatePrice } from '@/lib/pricing';

const STORAGE_KEY = 'lf_selected_categories';

export default function CategorySelector({ initialSelected = [], onProceed }) {
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [billing, setBilling] = useState('monthly');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Restore selection from localStorage on first mount (browsing persistence)
  useEffect(() => {
    if (initialSelected.length) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) setSelected(new Set(saved));
    } catch {
      /* ignore */
    }
  }, [initialSelected.length]);

  // Persist selection while browsing
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  }, [selected]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const pricing = calculatePrice(selected.size, billing);

  const visible = CATEGORIES.filter((c) => {
    const tierOk = filter === 'all' || c.tier === filter;
    const qOk = !search || [c.name, c.description].join(' ').toLowerCase().includes(search.toLowerCase());
    return tierOk && qOk;
  });

  return (
    <div className="cat-selector">
      {/* Filters + Search */}
      <div className="cat-filter-bar">
        <div className="cat-filter-tabs">
          {['all', 'ultra', 'high', 'medium'].map((t) => (
            <button key={t} className={`filter-tab ${filter === t ? 'on' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All categories' : TIERS[t]?.label || t}
            </button>
          ))}
        </div>
        <input
          className="cat-search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category grid */}
      <div className="cat-grid">
        {visible.map((cat) => {
          const isSelected = selected.has(cat.id);
          const tier = TIERS[cat.tier];
          return (
            <button
              key={cat.id}
              className={`cat-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(cat.id)}
              aria-pressed={isSelected}
            >
              {isSelected && <span className="cat-check" aria-hidden>✓</span>}
              <div className="cat-icon" aria-hidden>{cat.icon}</div>
              <div className="cat-name">{cat.name}</div>
              <div className="cat-desc">{cat.description}</div>
              <div className="cat-meta">
                <span className={`cat-roi-badge tier-${cat.tier}`}>{tier.label}</span>
                <span className="cat-leads">~{cat.monthlyLeads} leads/mo</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky pricing bar */}
      <div className="pricing-bar" aria-live="polite">
        <div className="pb-selection">
          <strong>{selected.size}</strong> {selected.size === 1 ? 'category' : 'categories'} selected
          {pricing.discount > 0 && <span className="pb-discount">{pricing.discount}% discount applied</span>}
        </div>

        <div className="pb-billing-toggle">
          <button className={billing === 'monthly' ? 'on' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
          <button className={billing === 'annual' ? 'on' : ''} onClick={() => setBilling('annual')}>
            Annual <span className="pb-save-badge">Save 20%</span>
          </button>
        </div>

        <div className="pb-price-display">
          {selected.size === 0 ? (
            <span className="pb-price-zero">Select categories to see price</span>
          ) : (
            <div>
              <span className="pb-price">${pricing.price}</span>
              <span className="pb-cycle">/month</span>
              {pricing.discount > 0 && <span className="pb-was">${pricing.rawPrice}</span>}
              {pricing.tier && (
                <div className="pb-tier">{pricing.tier.label} plan · ${pricing.perCat}/category</div>
              )}
            </div>
          )}
        </div>

        <button
          className="pb-cta-btn"
          disabled={selected.size === 0}
          onClick={() => onProceed?.(Array.from(selected), billing, pricing)}
        >
          {selected.size === 0 ? 'Select at least 1 category' : `Get leads for ${selected.size} industries →`}
        </button>
      </div>
    </div>
  );
}
