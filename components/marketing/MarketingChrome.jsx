// Public marketing header + footer (server component, no auth). Reuses the app
// design system. Links go to /start (the authed entry) — login/checkout unchanged.
import Link from 'next/link';

export function MarketingHeader() {
  return (
    <nav className="mkt-nav">
      <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
        <span className="brand-icon">🎯</span>
        <span className="brand-name">LeadForge</span>
      </Link>
      <div className="mkt-nav-links">
        <Link href="/#how" className="nav-link">How it works</Link>
        <Link href="/#pricing" className="nav-link">Pricing</Link>
        <Link href="/start" className="nav-link">Log in</Link>
        <Link href="/start" className="mkt-btn mkt-btn-primary" style={{ padding: '9px 16px', fontSize: 14 }}>Get started</Link>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  const year = 2026;
  return (
    <footer className="mkt-footer">
      <div className="inner">
        <div>© {year} LeadForge · Local &amp; vertical leads — verified, sequenced, guaranteed.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/#how" className="nav-link">How it works</Link>
          <Link href="/#pricing" className="nav-link">Pricing</Link>
          <Link href="/start" className="nav-link">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
