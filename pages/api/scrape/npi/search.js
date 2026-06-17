// pages/api/scrape/npi/search.js
// FREE named-people search via the CMS NPI Registry (no API key). Finds
// individual discharge-planning providers (social workers, case managers) by
// location and ingests them as contacts (name + phone + city/state; no email).
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { findNpiProviders } from '@/lib/sources/npi';
import { normalizeState } from '@/lib/sources/osm';
import { ingestContacts } from '@/lib/contacts/ingest';

// Parse "Los Angeles, CA" → { city, state }. State may be a name or code.
function parseLocation(location) {
  const parts = String(location).split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { city: null, state: null };
  if (parts.length === 1) {
    const asState = normalizeState(parts[0]);
    if (/^[A-Z]{2}$/.test(asState)) return { city: null, state: asState };
    return { city: parts[0], state: null };
  }
  return { city: parts[0], state: normalizeState(parts[parts.length - 1]) };
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const categoryId = req.body?.category_id;
  if (!categoryId || !CATEGORY_MAP[categoryId]) {
    return res.status(400).json({ message: 'A valid category_id is required' });
  }
  const { city, state } = parseLocation(req.body?.location || '');
  if (!state) {
    return res.status(400).json({ message: 'Include a state, e.g. "Los Angeles, CA" or "CA".' });
  }

  const job = await db.scrapeJob.create({
    data: { userId: user.id, jobType: 'npi_people', platform: 'npi', parameters: { categoryId, city, state }, status: 'running', startedAt: new Date() },
  });

  try {
    const { contacts, found } = await findNpiProviders({ state, city, categoryId });
    const results = await ingestContacts(contacts, { userId: user.id, categoryId });
    await db.scrapeJob.update({ where: { id: job.id }, data: { status: 'completed', contactsFound: found, contactsNew: results.added, completedAt: new Date() } });
    return res.status(200).json({ found, ...results, state, city });
  } catch (err) {
    await db.scrapeJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: err.message, completedAt: new Date() } });
    return res.status(err.status || 502).json({ error: 'NPI_FAILED', message: err.message });
  }
}

export default withErrorHandler(handler);
