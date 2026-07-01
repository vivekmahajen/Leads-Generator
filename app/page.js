// Public marketing homepage (static / server-rendered). Copy is governed by
// docs/CLAIMS.md — every claim maps to shipped code; no banned claims.
import Link from 'next/link';
import { MarketingHeader, MarketingFooter } from '@/components/marketing/MarketingChrome';
import { PRICING_TIERS } from '@/lib/pricing';
import { VERTICALS, CITIES } from '@/lib/marketing/geo';

export const metadata = {
  title: 'LeadForge — the leads the big databases miss',
  description:
    'Local & vertical prospects Apollo and ZoomInfo don’t carry — sourced live from OpenStreetMap and the US NPI registry, email-verified, sequenced in-product, and if one’s a dud we replace it.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'LeadForge — the leads the big databases miss',
    description: 'Local & vertical leads: verified, sequenced in one tool, and replacement-guaranteed.',
    type: 'website',
  },
};

const PILLARS = [
  { icon: '📍', h: 'Sourced where they can’t look', p: 'Live local businesses from OpenStreetMap and the full US healthcare registry (NPI), by city and taxonomy — the long tail curated national databases structurally skip.' },
  { icon: '✉️', h: 'Find → sequence in one', p: 'Leads land, get email-verified, and start a personal email sequence in-product. Replies auto-qualify; unsubscribes and bounces auto-suppress. No second tool.' },
  { icon: '🔁', h: 'We replace the duds', p: 'A hard-bounced lead isn’t your problem — it’s ours. Bounces are flagged for replacement automatically. You pay for leads you can actually reach.' },
];

const STEPS = [
  { n: '01', h: 'Find', p: 'Pick a category + city. We pull real businesses (OpenStreetMap) or named healthcare providers (NPI).' },
  { n: '02', h: 'Verify', p: 'Emails run a Hunter → Snov → MX waterfall. Only deliverable addresses get sequenced.' },
  { n: '03', h: 'Deliver', p: 'Leads land on your dashboard with city/state filters, intent score, and CSV export.' },
  { n: '04', h: 'Sequence', p: 'Enroll into a multi-step email cadence — merge fields, one-click unsubscribe, region-aware.' },
  { n: '05', h: 'Replace', p: 'Bounces are auto-flagged for replacement. Replies move the lead to qualified on their own.' },
];

export default function MarketingHome() {
  const popular = 'growth';
  return (
    <div className="mkt">
      <MarketingHeader />
      <main className="mkt-main">
        {/* Hero */}
        <section className="mkt-hero">
          <span className="mkt-eyebrow">Local &amp; vertical B2B leads</span>
          <h1 className="mkt-h1">The leads the big <span className="grad">databases miss</span>.</h1>
          <p className="mkt-sub">
            Local &amp; vertical prospects Apollo and ZoomInfo don’t carry — sourced live, email-verified,
            sequenced without leaving the product, and if one’s a dud, <strong>we replace it</strong>.
          </p>
          <div className="mkt-cta-row">
            <Link href="/start" className="mkt-btn mkt-btn-primary">Start finding leads →</Link>
            <Link href="/#how" className="mkt-btn mkt-btn-ghost">See how it works</Link>
          </div>
          <div className="mkt-trust">
            <strong>Verified emails</strong> · unsubscribe &amp; suppression respected · region-aware sending · replacement guarantee
          </div>
        </section>

        {/* Three pillars — above the fold repositioning */}
        <section aria-label="Why LeadForge">
          <div className="pillars">
            {PILLARS.map((p) => (
              <div className="pillar" key={p.h}>
                <div className="pillar-icon" aria-hidden>{p.icon}</div>
                <h3>{p.h}</h3>
                <p>{p.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mkt-section" id="how">
          <h2 className="mkt-section-title">Find → Verify → Deliver → Sequence → Replace</h2>
          <p className="mkt-section-sub">One flow, one tool. From a city + category to a personal first-touch — with the duds replaced.</p>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why the databases miss these */}
        <section className="mkt-section">
          <h2 className="mkt-section-title">Why the big databases miss these</h2>
          <p className="mkt-section-sub">
            Apollo and ZoomInfo curate national records built for enterprise sales — which structurally
            under-cover local service businesses, SMBs, and niche verticals. LeadForge is built for exactly
            that gap: it queries live open sources (OpenStreetMap) and public registries (NPI) at the city
            and taxonomy level, so you reach the roofer, the SNF case manager, or the neighborhood clinic
            the national databases never carried.
          </p>
        </section>

        {/* Guarantee */}
        <section className="mkt-section">
          <div className="guarantee-card">
            <h3>🔁 The replacement guarantee</h3>
            <p>
              If a delivered lead hard-bounces, it’s automatically flagged for replacement — no support
              ticket, no argument. Because we only sequence <strong>verified, deliverable</strong> addresses,
              bounces are rare; when they happen, they’re on us. You pay for leads you can actually reach.
            </p>
          </div>
        </section>

        {/* Pricing — real, from the pricing engine */}
        <section className="mkt-section" id="pricing">
          <h2 className="mkt-section-title">Category-based pricing</h2>
          <p className="mkt-section-sub">Pick the industries you want; the price adapts in real time — more categories, better per-category rate. Monthly, cancel anytime.</p>
          <div className="mkt-price-grid">
            {PRICING_TIERS.map((t) => (
              <div className={`mkt-price-card ${t.id === popular ? 'pop' : ''}`} key={t.id}>
                <div className="mkt-price-name">{t.label}{t.id === popular && ' · Most popular'}</div>
                <div className="mkt-price-amt">${t.basePrice}<small>/mo start</small></div>
                <div className="mkt-price-meta">{t.minCats}–{t.maxCats} categories · {t.leadsPerMonth} leads/mo</div>
              </div>
            ))}
          </div>
          <p className="mkt-section-sub" style={{ marginTop: 18 }}>
            <Link href="/start" className="mkt-btn mkt-btn-primary">Pick your categories →</Link>
          </p>
        </section>

        {/* Programmatic SEO internal links */}
        <section className="mkt-section">
          <h2 className="mkt-section-title">Leads by vertical &amp; city</h2>
          <p className="mkt-section-sub">Browse what we can find in your market right now.</p>
          <div className="seo-links">
            {VERTICALS.slice(0, 6).flatMap((v) => CITIES.slice(0, 6).map((c) => (
              <Link key={`${v.slug}-${c.slug}`} href={`/leads/${v.slug}/${c.slug}`}>{v.label} · {c.name}</Link>
            )))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
