// lib/scrapers/twitter/intentSearch.js
// Twitter/X intent search via API v2 recent-search.
//
// NOTE: As of 2023+, the recent-search endpoint requires a PAID X API plan
// (Basic and up). The Free tier is write-only and will return 403 here. The
// code is correct and works the moment a token with search access is set.

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';

// Hand-crafted intent queries per category (buyers, not bots/news).
export const INTENT_QUERIES = {
  real_estate: [
    '"looking for a realtor" OR "need a real estate agent" -job -hiring',
    '"buying a house" OR "buying a home" "any recommendations"',
    '"looking for property" "advice" OR "recommend"',
  ],
  insurance: [
    '"health insurance" "confused" OR "which one" OR "recommend"',
    '"term insurance" "recommend" OR "best" OR "should I"',
    '"car insurance" "renewal" "cheapest" OR "best"',
  ],
  fintech_loans: [
    '"personal loan" "low interest" OR "best rate" OR "recommend"',
    '"home loan" "which" OR "best" OR "recommend"',
    '"business loan" "startup" "how to" OR "where"',
  ],
  edtech: [
    '"looking for an online course" "data science" OR "python" OR "product management"',
    '"upskilling" "any recommendations" OR "where to learn"',
  ],
  saas_software: [
    '"looking for a CRM" OR "need a CRM" -job -hiring',
    '"alternatives to Salesforce" OR "alternatives to HubSpot"',
    '"HR software" "recommend" OR "best" -job',
  ],
  healthcare: [
    '"looking for a doctor" OR "need a specialist"',
    '"mental health" "therapist" "recommend" -ad',
  ],
  automotive: [
    '"buying a car" "suggest" OR "recommend" OR "which one"',
    '"EV" "electric car" "recommend" OR "best"',
  ],
  legal: [
    '"looking for a lawyer" OR "need a lawyer" -job',
    '"legal advice" "property" OR "divorce" OR "business" "help"',
  ],
  digital_marketing: [
    '"looking for a digital marketing agency" -job -hiring',
    '"SEO" "agency" "recommend" OR "best"',
    '"Google Ads" "wasting money" OR "not working"',
  ],
  solar_energy: [
    '"solar panels" "recommend" OR "best" OR "cost"',
    '"rooftop solar" "subsidy" OR "installation" "help"',
  ],
  wedding_events: [
    '"wedding photographer" "recommend"',
    '"wedding venue" "looking for" OR "suggest"',
    '"event planner" "corporate" "recommend"',
  ],
  agriculture: [
    '"farm management" "app" OR "software" "recommend"',
    '"crop insurance" "how to" OR "apply" OR "which"',
  ],
  fitness_wellness: [
    '"personal trainer" "online" "recommend"',
    '"dietitian" "online" "recommend" OR "consult"',
  ],
  logistics: [
    '"logistics partner" "ecommerce" "recommend" OR "best"',
    '"courier" "bulk" "reliable" "recommend"',
  ],
};

export async function searchTwitter(query, maxResults = 50, sinceId = null) {
  if (!TWITTER_BEARER_TOKEN) {
    const e = new Error('TWITTER_BEARER_TOKEN is not set. Add an X API token (paid plan — recent search is not on the free tier).');
    e.status = 503;
    throw e;
  }
  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
    'tweet.fields': 'created_at,author_id,text,public_metrics,entities',
    'user.fields': 'name,username,description,location,public_metrics,url',
    expansions: 'author_id',
  });
  if (sinceId) params.set('since_id', sinceId);

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
  });

  if (res.status === 429) {
    const reset = res.headers.get('x-rate-limit-reset');
    const e = new Error(`X rate limited. Resets at ${reset ? new Date(reset * 1000).toISOString() : 'soon'}.`);
    e.status = 429;
    throw e;
  }
  if (res.status === 401 || res.status === 403) {
    const e = new Error('X rejected the request — recent search requires a paid X API plan. Upgrade at developer.twitter.com.');
    e.status = 402;
    throw e;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const e = new Error(`X API error (${res.status}). ${text.slice(0, 200)}`);
    e.status = 502;
    throw e;
  }
  return res.json();
}

function calculateTwitterIntentScore(tweet, user, query) {
  let score = 50;
  const text = (tweet.text || '').toLowerCase();
  if (text.includes('looking for')) score += 25;
  if (text.includes('need a') || text.includes('need an')) score += 20;
  if (text.includes('recommend')) score += 15;
  if (text.includes('any suggestions')) score += 15;
  if (text.includes('help me')) score += 10;
  if (text.includes('dm me') || text.includes('dm if')) score += 5;

  const ageHours = (Date.now() - new Date(tweet.created_at).getTime()) / 3_600_000;
  if (ageHours < 2) score += 20;
  else if (ageHours < 6) score += 15;
  else if (ageHours < 24) score += 10;

  if (user.public_metrics?.followers_count > 100) score += 5;
  if (user.public_metrics?.followers_count > 1000) score += 5;

  const bio = (user.description || '').toLowerCase();
  for (const word of query.toLowerCase().split(/\s+/)) {
    if (word.length > 4 && bio.includes(word.replace(/["']/g, ''))) score += 5;
  }
  return Math.min(100, score);
}

const cityFromLocation = (loc) => (loc ? loc.split(',')[0].trim() : '');
function countryFromLocation(loc) {
  const l = (loc || '').toLowerCase();
  if (/india|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|pune/.test(l)) return 'IN';
  return 'US';
}

export function extractContactsFromTweets(data, query, categoryId) {
  if (!data.data || !data.includes?.users) return [];
  const userMap = Object.fromEntries(data.includes.users.map((u) => [u.id, u]));
  return data.data
    .map((tweet) => {
      const user = userMap[tweet.author_id];
      if (!user) return null;
      return {
        sourcePlatform: 'twitter',
        sourceType: 'intent_search',
        fullName: user.name,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        username: user.username,
        profileUrl: `https://twitter.com/${user.username}`,
        twitterUrl: `https://twitter.com/${user.username}`,
        headline: user.description || '',
        city: cityFromLocation(user.location),
        country: countryFromLocation(user.location),
        sourceKeyword: query,
        sourceTweetText: tweet.text,
        categoryId,
        intentScore: calculateTwitterIntentScore(tweet, user, query),
        enrichmentStatus: 'pending',
      };
    })
    .filter(Boolean);
}
