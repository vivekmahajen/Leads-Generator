// pages/api/scrape/twitter/search.js
// Run the intent queries for a category against X/Twitter and ingest results.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { INTENT_QUERIES, searchTwitter, extractContactsFromTweets } from '@/lib/scrapers/twitter/intentSearch';
import { ingestContacts } from '@/lib/contacts/ingest';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const categoryId = req.body?.category_id;
  if (!categoryId || !CATEGORY_MAP[categoryId]) {
    return res.status(400).json({ message: 'A valid category_id is required' });
  }
  const queries = INTENT_QUERIES[categoryId];
  if (!queries) {
    return res.status(400).json({ message: 'No intent queries defined for this category yet' });
  }
  const maxResults = Math.min(Math.max(parseInt(req.body?.max_results, 10) || 25, 10), 100);

  let totalNew = 0;
  let totalFound = 0;
  const errors = [];

  for (const query of queries) {
    const job = await db.scrapeJob.create({
      data: { userId: user.id, jobType: 'twitter_intent', platform: 'twitter', parameters: { query, categoryId }, status: 'running', startedAt: new Date() },
    });
    try {
      const data = await searchTwitter(query, maxResults);
      const contacts = extractContactsFromTweets(data, query, categoryId);
      const results = await ingestContacts(contacts, { userId: user.id, categoryId });
      totalNew += results.added;
      totalFound += contacts.length;
      await db.scrapeJob.update({ where: { id: job.id }, data: { status: 'completed', contactsFound: contacts.length, contactsNew: results.added, completedAt: new Date() } });
      await new Promise((r) => setTimeout(r, 1500)); // rate-limit courtesy
    } catch (err) {
      errors.push({ query, status: err.status || 500, error: err.message });
      await db.scrapeJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: err.message, completedAt: new Date() } });
      // Auth/plan errors won't resolve across queries — stop early.
      if (err.status === 402 || err.status === 503) break;
    }
  }

  // If nothing ran and the only problem was config/plan, surface that status.
  if (totalFound === 0 && errors.length && (errors[0].status === 402 || errors[0].status === 503)) {
    return res.status(errors[0].status).json({ error: 'X_UNAVAILABLE', message: errors[0].error });
  }

  return res.status(200).json({ categoryId, newContacts: totalNew, found: totalFound, queriesRun: queries.length, errors });
}

export default withErrorHandler(handler);
