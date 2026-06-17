// pages/api/scrape/local/search.js
// FREE real-business search via OpenStreetMap (no API key). Finds businesses for
// a category near a location and ingests them as contacts for review.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { findLocalBusinesses } from '@/lib/sources/osm';
import { ingestContacts } from '@/lib/contacts/ingest';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { category_id, location } = req.body || {};
  if (!category_id || !CATEGORY_MAP[category_id]) {
    return res.status(400).json({ message: 'A valid category_id is required' });
  }
  if (!location || !String(location).trim()) {
    return res.status(400).json({ message: 'A location is required (e.g. "Austin, TX")' });
  }

  const job = await db.scrapeJob.create({
    data: { userId: user.id, jobType: 'osm_local', platform: 'osm', parameters: { category_id, location }, status: 'running', startedAt: new Date() },
  });

  try {
    const { contacts, location: resolved } = await findLocalBusinesses(category_id, String(location).trim());
    const results = await ingestContacts(contacts, { userId: user.id, categoryId: category_id });
    await db.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'completed', contactsFound: contacts.length, contactsNew: results.added, completedAt: new Date() },
    });
    return res.status(200).json({ found: contacts.length, ...results, location: resolved });
  } catch (err) {
    await db.scrapeJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: err.message, completedAt: new Date() } });
    return res.status(err.status || 502).json({ error: 'LOOKUP_FAILED', message: err.message });
  }
}

export default withErrorHandler(handler);
