// pages/api/leads/export.js
// Stream the user's leads as a CSV download. Auth via Bearer header or ?auth=
// query param (the export link can't set headers).
import { withErrorHandler } from '@/lib/apiHandler';
import { db } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const deliveries = await db.leadDelivery.findMany({
    where: { userId: user.id },
    include: { lead: true },
    orderBy: { deliveredAt: 'desc' },
  });

  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
    'Category', 'City', 'State', 'Intent Score', 'Status', 'Delivered At',
  ];

  const rows = deliveries.map((d) => [
    d.lead?.firstName, d.lead?.lastName, d.lead?.email, d.lead?.phone,
    d.lead?.companyName, d.lead?.jobTitle, d.categoryId || d.lead?.categoryId,
    d.lead?.city, d.lead?.state, d.lead?.intentScore, d.status,
    d.deliveredAt?.toISOString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leadforge-leads-${Date.now()}.csv"`);
  return res.status(200).send(csv);
}

export default withErrorHandler(handler);
