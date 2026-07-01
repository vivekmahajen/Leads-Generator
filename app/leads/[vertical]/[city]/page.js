// Programmatic SEO: "[vertical] leads in [city]". Grounded in a real, cached
// OSM/NPI query per page — never a fabricated count. Empty combinations are
// noindexed rather than published as thin templates.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MarketingHeader, MarketingFooter } from '@/components/marketing/MarketingChrome';
import { VERTICALS, CITIES, verticalBySlug, cityBySlug } from '@/lib/marketing/geo';
import { countLocalBusinesses } from '@/lib/sources/osm';
import { countNpiProviders } from '@/lib/sources/npi';

export const revalidate = 86400; // ISR: refresh the real count daily

// Shared, request-cached data fetch (dedupes generateMetadata + page).
const getData = cache(async (vSlug, cSlug) => {
  const v = verticalBySlug(vSlug);
  const c = cityBySlug(cSlug);
  if (!v || !c) return null;
  try {
    if (v.source === 'npi') {
      const r = await countNpiProviders({ state: c.state, city: c.name, categoryId: v.categoryId });
      return { v, c, count: r.total || 0 };
    }
    const r = await countLocalBusinesses(v.categoryId, `${c.name}, ${c.state}`);
    return { v, c, count: r.total || 0 };
  } catch {
    return { v, c, count: 0, error: true };
  }
});

// Pre-build a bounded, high-value subset; other valid combos render on-demand (ISR).
export function generateStaticParams() {
  const params = [];
  for (const v of VERTICALS.slice(0, 4)) {
    for (const c of CITIES.slice(0, 8)) params.push({ vertical: v.slug, city: c.slug });
  }
  return params;
}

export async function generateMetadata({ params }) {
  const data = await getData(params.vertical, params.city);
  if (!data) return {};
  const { v, c, count } = data;
  const url = `/leads/${v.slug}/${c.slug}`;
  const title = `${v.label} leads in ${c.name}, ${c.state} — verified & sequenced | LeadForge`;
  const description = `Find ${v.label.toLowerCase()} ${v.unit} in ${c.name}, ${c.state} — sourced live, email-verified, and sequenced in one tool. Duds replaced.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: count > 0 ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function VerticalCityPage({ params }) {
  const data = await getData(params.vertical, params.city);
  if (!data) notFound();
  const { v, c, count } = data;

  const relatedCities = CITIES.filter((x) => x.slug !== c.slug).slice(0, 6);
  const relatedVerticals = VERTICALS.filter((x) => x.slug !== v.slug).slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${v.label} lead generation in ${c.name}, ${c.state}`,
    serviceType: `${v.label} B2B leads`,
    areaServed: { '@type': 'City', name: c.name, containedInPlace: { '@type': 'State', name: c.state } },
    provider: { '@type': 'Organization', name: 'LeadForge' },
    description: `Verified, sequenced ${v.label.toLowerCase()} leads in ${c.name}, ${c.state}.`,
  };

  return (
    <div className="mkt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <main className="mkt-main">
        <section className="mkt-hero">
          <span className="mkt-eyebrow">{c.name}, {c.state}</span>
          <h1 className="mkt-h1">{v.label} leads in <span className="grad">{c.name}</span></h1>
          {count > 0 ? (
            <p className="mkt-sub">We found roughly <strong>{count.toLocaleString()}{count >= 120 ? '+' : ''}</strong> {v.label.toLowerCase()} {v.unit} in and around {c.name}, {c.state} — email-verified where possible, and ready to sequence in one tool.</p>
          ) : (
            <p className="mkt-sub">We source {v.label.toLowerCase()} {v.unit} in {c.name}, {c.state} on demand — sourced live, email-verified, and sequenced in-product.</p>
          )}
          <div className="mkt-cta-row">
            <Link href="/start" className="mkt-btn mkt-btn-primary">Get these leads →</Link>
            <Link href="/#how" className="mkt-btn mkt-btn-ghost">How it works</Link>
          </div>
          <div className="mkt-trust"><strong>Verified emails</strong> · sequenced in-product · replacement guarantee</div>
        </section>

        <section className="mkt-section">
          <h2 className="mkt-section-title">What’s included</h2>
          <div className="steps">
            <div className="step"><div className="step-n">Source</div><h4>{v.source === 'npi' ? 'US NPI registry' : 'OpenStreetMap'}</h4><p>{v.source === 'npi' ? 'Named providers by taxonomy + city — the people the databases don’t list.' : 'Live local businesses by category + city — the long tail national databases skip.'}</p></div>
            <div className="step"><div className="step-n">Verify</div><h4>Deliverable only</h4><p>Hunter → Snov → MX waterfall; only reachable addresses get sequenced.</p></div>
            <div className="step"><div className="step-n">Sequence</div><h4>In-product email</h4><p>Personal, region-aware first-touch. Replies auto-qualify; unsubscribes auto-suppress.</p></div>
            <div className="step"><div className="step-n">Guarantee</div><h4>Duds replaced</h4><p>Hard bounces are flagged for replacement automatically.</p></div>
          </div>
        </section>

        <section className="mkt-section">
          <h2 className="mkt-section-title">Nearby &amp; related</h2>
          <p className="mkt-section-sub">{v.label} in other cities</p>
          <div className="seo-links">
            {relatedCities.map((rc) => <Link key={rc.slug} href={`/leads/${v.slug}/${rc.slug}`}>{v.label} · {rc.name}</Link>)}
          </div>
          <p className="mkt-section-sub" style={{ marginTop: 20 }}>Other verticals in {c.name}</p>
          <div className="seo-links">
            {relatedVerticals.map((rv) => <Link key={rv.slug} href={`/leads/${rv.slug}/${c.slug}`}>{rv.label} · {c.name}</Link>)}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
