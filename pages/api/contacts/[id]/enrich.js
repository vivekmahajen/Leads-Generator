// pages/api/contacts/[id]/enrich.js — run the email waterfall for one contact.
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { enrichContact } from '@/lib/enrichment/emailWaterfall';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const contact = await db.rawContact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  if (!contact.companyDomain) {
    return res.status(422).json({ error: 'NO_DOMAIN', message: 'No company domain on this contact — email finders need a domain.' });
  }

  const updated = await enrichContact(contact.id);
  return res.status(200).json({
    id: updated.id,
    email: updated.email,
    email_verified: updated.emailVerified,
    email_source: updated.emailSource,
    status: updated.enrichmentStatus,
  });
}

export default withErrorHandler(handler);
