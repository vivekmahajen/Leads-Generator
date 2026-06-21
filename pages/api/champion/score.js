// pages/api/champion/score.js
// Run the "champion job-change" engine (Stages 2-7) over a CSV of candidate
// people you supply. Stateless: parse -> qualify -> score -> rank -> return.
import { withErrorHandler } from '@/lib/apiHandler';
import { getUserFromToken } from '@/lib/auth';
import { parseCSV } from '@/lib/csv';
import { processChampions } from '@/lib/champion';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { csv, config = {} } = req.body || {};
  if (!csv || typeof csv !== 'string') return res.status(400).json({ message: 'A CSV payload is required' });

  const rows = parseCSV(csv);
  if (!rows.length) return res.status(400).json({ message: 'No data rows found in the CSV' });
  if (rows.length > 5000) return res.status(400).json({ message: 'Please submit 5000 rows or fewer at a time' });

  const cfg = {
    recencyWindowMonths: Number(config.recencyWindowMonths) || 12,
    volume: Math.min(Math.max(Number(config.volume) || 50, 1), 1000),
    targetProduct: config.targetProduct?.trim() || null,
    geo: config.geo || null,
    exclusions: {
      companies: Array.isArray(config.exclusions?.companies) ? config.exclusions.companies : [],
      emails: Array.isArray(config.exclusions?.emails) ? config.exclusions.emails : [],
    },
  };

  const result = processChampions(rows, cfg);
  return res.status(200).json(result);
}

export default withErrorHandler(handler);
