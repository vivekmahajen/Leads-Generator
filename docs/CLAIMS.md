# LeadForge — Claims Ledger

Every marketing/SEO claim must map to a shipped feature here. **No backing → not on the page.**
This is the source of truth for the homepage and the programmatic SEO pages.

## ✅ Claimable (verified shipped)

| Claim (as phrased on site) | Backing (repo) | Status |
|---|---|---|
| "Local businesses the big databases skip" — sourced live from OpenStreetMap by category + city | `lib/sources/osm.js` (`findLocalBusinesses`, `countLocalBusinesses`), `pages/api/scrape/local/search.js` | shipped |
| "The full US healthcare registry" — named providers (social workers, case managers, etc.) via NPI, by taxonomy + city/state | `lib/sources/npi.js` (`findNpiProviders`, `countNpiProviders`), `pages/api/scrape/npi/search.js` | shipped |
| "Verified emails" — Hunter → Snov → pattern+MX waterfall; only deliverable addresses are sequenced | `lib/enrichment/emailWaterfall.js`, `lib/outreach/guards.js` (`ensureDeliverable`) | shipped |
| "Find → sequence in one" — leads land, get verified, and start a personal email sequence in-product | `lib/outreach/*`, `pages/api/cron/send-sequences.js`, `components/Sequences.jsx` | shipped |
| "Reply detection auto-qualifies; unsubscribe & bounces auto-suppress" | `lib/outreach/events.js`, `pages/api/outreach/{inbound,unsubscribe}.js`, `pages/api/cron/poll-gmail.js` | shipped |
| "Region-aware sending" — EU/UK/India flagged (no opt-out basis) | `lib/outreach/policy.js` (`isRestrictedRegion`) | shipped |
| "We replace the duds" — a hard-bounced lead is flagged for replacement | `lib/outreach/events.js` (bounce → `replacementRequested`), `pages/api/leads/[id]/replace.js` | shipped |
| "Category-based, real-time pricing across 28 industries" | `lib/pricing.js`, `lib/categories.js` (29 categories incl. Discharge Planning) | shipped |
| "A job-change buying signal" — champion engine (used product at past co → moved to new co) | `lib/champion.js`, `pages/api/champion/*` | shipped (bring-a-CSV / paid PDL) |
| "N businesses found in [city]" (on SEO pages) | real, cached `countLocalBusinesses` / `countNpiProviders` query; page `noindex`ed if zero/failed | shipped (data-gated) |

## ❌ Banned (unshipped or false — must NOT appear)

| Banned claim | Why |
|---|---|
| A proprietary database of size N ("500M contacts") | LeadForge sources **live**; there is no stored DB of that scale. Sell freshness + coverage, never a number. |
| CRM sync (Salesforce/HubSpot) | Not built. |
| High-volume / "unlimited" sending | Sender is Gmail SMTP (~200/day cap in `entitlement.js`). Position as **personal, deliverable first-touch**, not agency blasting. |
| SOC 2 / enterprise certifications | Not obtained. May state honest specifics (verified emails, unsubscribe/suppression, region-aware). |
| Dialer / phone / SMS / LinkedIn automation | None exist. |
| AI-written / AI-personalized emails | Emails are merge-field templates (`lib/outreach/render.js`), not AI copy. |
| Testimonials, logos, customer counts, star ratings | No real social proof yet — use honest placeholders or omit. |
| "Real-time intent data" (beyond job-change) | Base lead score is a completeness heuristic (`lib/scoring.js`), not buying intent. |

## Framing rules
- Comparative claims stay categorical, not disparaging: "the leads the big databases structurally
  don't serve (local, SMB, niche vertical)" — a documented coverage gap, not a specific slur.
- Every number is real (from a cached query) or absent. Never fabricate a count.
