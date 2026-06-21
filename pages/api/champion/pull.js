// pages/api/champion/pull.js
// Auto-build champion leads from a compliant data API (People Data Labs), then
// run them through the champion engine. Requires PDL_API_KEY.
import { withErrorHandler } from '@/lib/apiHandler';
import { getUserFromToken } from '@/lib/auth';
import { normalizeState } from '@/lib/sources/osm';
import { searchChampions } from '@/lib/sources/pdl';
import { processChampions } from '@/lib/champion';

function parseLocation(location) {
  const parts = String(location || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { city: null, state: null };
  if (parts.length === 1) {
    const st = normalizeState(parts[0]);
    return /^[A-Z]{2}$/.test(st) ? { city: null, state: parts[0] } : { city: parts[0], state: null };
  }
  return { city: parts[0], state: parts[parts.length - 1] };
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { target_product, location, titles, recency_months, volume, size } = req.body || {};
  if (!target_product?.trim()) return res.status(400).json({ message: 'A target product is required' });

  const { city, state } = parseLocation(location);
  // PDL location_region wants the full state name (e.g. "california").
  const pdlState = state ? stateNameFromCode(normalizeState(state)) : null;

  let rows;
  try {
    ({ rows } = await searchChampions({
      targetProduct: target_product.trim(),
      state: pdlState,
      city,
      titles,
      size: Math.min(Math.max(Number(size) || 50, 1), 100),
    }));
  } catch (err) {
    return res.status(err.status || 502).json({ error: 'PDL_ERROR', message: err.message });
  }

  // PDL skills/usage gives HIGH for product-in-skills; the engine still applies
  // recency + influence + ICP + dedup + scoring.
  const result = processChampions(rows, {
    recencyWindowMonths: Number(recency_months) || 12,
    volume: Math.min(Math.max(Number(volume) || 50, 1), 200),
    targetProduct: target_product.trim(),
  });
  return res.status(200).json({ ...result, pulled: rows.length });
}

// PDL location_region expects the full state name (e.g. "california").
const CODE_TO_NAME = {
  AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california', CO: 'colorado', CT: 'connecticut',
  DE: 'delaware', DC: 'district of columbia', FL: 'florida', GA: 'georgia', HI: 'hawaii', ID: 'idaho', IL: 'illinois',
  IN: 'indiana', IA: 'iowa', KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts',
  MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada',
  NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico', NY: 'new york', NC: 'north carolina', ND: 'north dakota',
  OH: 'ohio', OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina',
  SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington',
  WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming',
};
function stateNameFromCode(s) {
  return CODE_TO_NAME[String(s).toUpperCase()] || s;
}

export default withErrorHandler(handler);
