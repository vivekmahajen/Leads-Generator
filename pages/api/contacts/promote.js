// pages/api/contacts/promote.js
// Promote reviewed raw contacts into the leads pipeline (Lead + LeadDelivery).
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { contactIds } = req.body || {};
  if (!Array.isArray(contactIds) || !contactIds.length) {
    return res.status(400).json({ message: 'contactIds is required' });
  }

  const contacts = await db.rawContact.findMany({
    where: { id: { in: contactIds }, userId: user.id, promotedToLead: false },
  });

  let promoted = 0;
  for (const c of contacts) {
    const lead = await db.lead.create({
      data: {
        categoryId: c.categoryId || 'real_estate',
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        companyName: c.companyName,
        jobTitle: c.jobTitle,
        city: c.city,
        state: c.state,
        country: c.country || 'US',
        qualificationData: {
          linkedin_url: c.linkedinUrl || null,
          twitter_url: c.twitterUrl || null,
          source_tweet: c.sourceTweetText || null,
          source_keyword: c.sourceKeyword || null,
        },
        intentScore: c.intentScore,
        source: c.sourcePlatform, // 'linkedin' | 'twitter'
      },
    });
    await db.leadDelivery.create({
      data: { leadId: lead.id, userId: user.id, categoryId: c.categoryId, status: 'new' },
    });
    await db.rawContact.update({ where: { id: c.id }, data: { promotedToLead: true, promotedAt: new Date() } });
    promoted += 1;
  }

  return res.status(200).json({ promoted });
}

export default withErrorHandler(handler);
