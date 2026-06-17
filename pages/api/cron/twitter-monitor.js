// pages/api/cron/twitter-monitor.js
// Vercel Cron entrypoint — runs every active Twitter saved search, ingesting new
// matches. Guarded by CRON_SECRET. Add to vercel.json:
//   { "crons": [{ "path": "/api/cron/twitter-monitor", "schedule": "0 */6 * * *" }] }
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { searchTwitter, extractContactsFromTweets } from '@/lib/scrapers/twitter/intentSearch';
import { ingestContacts } from '@/lib/contacts/ingest';

async function handler(req, res) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const searches = await db.savedSearch.findMany({ where: { active: true, platform: 'twitter' } });
  const summary = [];

  for (const search of searches) {
    try {
      const data = await searchTwitter(search.searchQuery, 50, search.lastSinceId || null);
      const contacts = extractContactsFromTweets(data, search.searchQuery, search.categoryId);
      const results = await ingestContacts(contacts, { userId: search.userId, categoryId: search.categoryId });
      await db.savedSearch.update({
        where: { id: search.id },
        data: { lastRunAt: new Date(), lastSinceId: data.meta?.newest_id || search.lastSinceId, totalLeads: { increment: results.added } },
      });
      summary.push({ label: search.label, new: results.added, found: contacts.length });
      await new Promise((r) => setTimeout(r, 4000));
    } catch (err) {
      summary.push({ label: search.label, error: err.message });
      if (err.status === 402 || err.status === 503) break; // config/plan issue — stop
    }
  }

  return res.status(200).json({ ok: true, ranAt: new Date().toISOString(), searches: searches.length, summary });
}

export default withErrorHandler(handler);
