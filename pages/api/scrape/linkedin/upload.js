// pages/api/scrape/linkedin/upload.js
// Receive a LinkedIn export (parsed contacts array, or raw CSV) and ingest it
// into raw_contacts. You produce the export via a Chrome extension
// (Skrapp/Derrick) or PhantomBuster — this endpoint imports the result.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { parseCSV } from '@/lib/csv';
import { ingestLinkedInProfiles } from '@/lib/contacts/ingest';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { contacts, csv, categoryId, sourceType, sourcePostUrl } = req.body || {};
  let profiles = Array.isArray(contacts) ? contacts : null;
  if (!profiles && typeof csv === 'string') profiles = parseCSV(csv);
  if (!profiles || !profiles.length) {
    return res.status(400).json({ message: 'Provide a contacts array or csv text' });
  }
  if (sourceType) profiles = profiles.map((p) => ({ ...p, source_type: sourceType, source_post_url: sourcePostUrl }));

  const job = await db.scrapeJob.create({
    data: {
      userId: user.id,
      jobType: sourceType || 'linkedin_upload',
      platform: 'linkedin',
      parameters: { sourcePostUrl: sourcePostUrl || null, categoryId: categoryId || null },
      status: 'running',
      startedAt: new Date(),
    },
  });

  const results = await ingestLinkedInProfiles(profiles, { userId: user.id, categoryId });

  await db.scrapeJob.update({
    where: { id: job.id },
    data: { status: 'completed', contactsFound: profiles.length, contactsNew: results.added, completedAt: new Date() },
  });

  return res.status(201).json({ jobId: job.id, contactsReceived: profiles.length, ...results });
}

export default withErrorHandler(handler);
