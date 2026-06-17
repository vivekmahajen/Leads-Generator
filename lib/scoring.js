// lib/scoring.js
// Unified intent scoring for LinkedIn and Twitter/X raw contacts (0-100).

export function scoreContact(contact, platform, sourceType) {
  const BASE = {
    linkedin: { people_search: 45, post_engager: 65, company_follower: 40 },
    twitter: { intent_search: 70, saved_search: 65, hashtag: 40 },
    osm: { local_business: 50 },
  };
  let score = BASE[platform]?.[sourceType] ?? 40;

  const text = [contact.headline || '', contact.sourceTweetText || contact.source_tweet_text || '', contact.companyName || contact.company_name || '']
    .join(' ')
    .toLowerCase();

  const HOT_KEYWORDS = [
    'looking for', 'need a', 'any recommendations', 'suggest', 'recommend',
    'dm me', 'help wanted', 'seeking', 'want to buy', 'interested in',
    'planning to', 'considering',
  ];
  for (const kw of HOT_KEYWORDS) if (text.includes(kw)) score += 15;

  const scrapedAt = contact.scrapedAt || contact.scraped_at;
  if (scrapedAt) {
    const hoursAgo = (Date.now() - new Date(scrapedAt).getTime()) / 3_600_000;
    if (hoursAgo < 1) score += 25;
    else if (hoursAgo < 6) score += 15;
    else if (hoursAgo < 24) score += 10;
    else if (hoursAgo < 48) score += 5;
  }

  if (contact.email) score += 10;
  if (contact.companyName || contact.company_name) score += 5;
  if (contact.jobTitle || contact.job_title) score += 5;
  if (contact.city) score += 3;

  return Math.min(100, Math.max(0, score));
}

export function getScoreLabel(score) {
  if (score >= 80) return { label: 'Hot', color: 'danger' };
  if (score >= 60) return { label: 'Warm', color: 'warning' };
  if (score >= 40) return { label: 'Cold', color: 'info' };
  return { label: 'Low', color: 'secondary' };
}
