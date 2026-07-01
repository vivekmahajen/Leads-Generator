// app/sitemap.js — lists the marketing home + the curated vertical×city SEO
// pages. Per-page `robots noindex` (when a real query returns 0) is the final
// gate, so empties won't be indexed even if listed here.
import { VERTICALS, CITIES } from '@/lib/marketing/geo';

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://leadforge.app').replace(/\/$/, '');
}

export default function sitemap() {
  const base = baseUrl();
  const now = new Date();
  const entries = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ];
  // Curated, high-confidence combinations (common verticals × major US metros).
  for (const v of VERTICALS) {
    for (const c of CITIES.slice(0, 20)) {
      entries.push({ url: `${base}/leads/${v.slug}/${c.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
    }
  }
  return entries;
}
