// lib/champion.js
// "Champion job-change" lead engine (Stages 2-7). Operates on candidate rows you
// supply via CSV (Stage 1 + product-usage evidence are your inputs) and applies
// the timeline, qualification, scoring, and dedup logic — no external data.

const get = (row, keys) => {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
};

const ALIASES = {
  person_name: ['person_name', 'name', 'full_name'],
  first_name: ['first_name', 'firstname', 'first'],
  last_name: ['last_name', 'lastname', 'last'],
  current_title: ['current_title', 'title', 'new_title', 'role_title'],
  current_company: ['current_company', 'new_company', 'company'],
  current_company_domain: ['current_company_domain', 'company_domain', 'domain', 'new_company_domain'],
  location_city: ['location_city', 'city'],
  location_state: ['location_state', 'state', 'region'],
  past_company: ['past_company_where_product_used', 'past_company', 'previous_company', 'old_company'],
  target_product: ['target_product', 'product'],
  usage_confidence: ['usage_confidence', 'confidence'],
  usage_evidence: ['usage_evidence', 'evidence'],
  job_change_date: ['job_change_date', 'start_date', 'joined_date'],
  role_influence: ['role_influence', 'influence'],
  icp_fit: ['new_company_icp_fit', 'icp_fit', 'icp'],
  existing_customer: ['new_company_is_existing_customer', 'existing_customer', 'is_customer'],
  email: ['verified_email', 'email'],
  email_confidence: ['email_confidence'],
  email_source: ['email_source'],
  linkedin_url: ['linkedin_url', 'linkedin'],
  x_handle: ['x_handle', 'twitter', 'x'],
};

const CONF = (v) => {
  const s = String(v || '').trim().toUpperCase();
  return s === 'HIGH' || s === 'MEDIUM' || s === 'LOW' ? s : '';
};
const INFLUENCE = (v) => {
  const s = String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['decision_maker', 'dm', 'decisionmaker'].includes(s)) return 'decision_maker';
  if (['influencer', 'influence'].includes(s)) return 'influencer';
  if (['user', 'end_user'].includes(s)) return 'user';
  return '';
};
const CUSTOMER = (v) => {
  const s = String(v || '').trim().toLowerCase();
  if (['yes', 'y', 'true', 'customer'].includes(s)) return 'yes';
  if (['no', 'n', 'false'].includes(s)) return 'no';
  return 'unknown';
};

export function monthsBetween(dateStr, now = new Date()) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return months < 0 ? null : months;
}

function parseEvidence(raw) {
  if (!raw) return [];
  // "claim :: url ;; claim :: url"  — or just a bare URL.
  return raw.split(';;').map((chunk) => {
    const [a, b] = chunk.split('::').map((x) => x.trim());
    if (b) return { claim: a, source_url: b };
    return /^https?:\/\//i.test(a) ? { claim: '', source_url: a } : { claim: a, source_url: '' };
  }).filter((e) => e.claim || e.source_url);
}

export function normalizeChampion(row) {
  let firstName = get(row, ALIASES.first_name);
  let lastName = get(row, ALIASES.last_name);
  const full = get(row, ALIASES.person_name) || [firstName, lastName].filter(Boolean).join(' ');
  if (!firstName && full) { const p = full.split(/\s+/); firstName = p[0]; lastName = lastName || p.slice(1).join(' '); }
  const icpRaw = parseInt(get(row, ALIASES.icp_fit), 10);
  const jobChangeDate = get(row, ALIASES.job_change_date) || null;
  return {
    person_name: full || null,
    current_title: get(row, ALIASES.current_title) || null,
    current_company: get(row, ALIASES.current_company) || null,
    current_company_domain: (get(row, ALIASES.current_company_domain) || '').replace(/^https?:\/\//, '').replace(/^www\./, '') || null,
    location_city: get(row, ALIASES.location_city) || null,
    location_state: get(row, ALIASES.location_state) || null,
    past_company_where_product_used: get(row, ALIASES.past_company) || null,
    target_product: get(row, ALIASES.target_product) || null,
    usage_confidence: CONF(get(row, ALIASES.usage_confidence)),
    usage_evidence: parseEvidence(get(row, ALIASES.usage_evidence)),
    job_change_date: jobChangeDate,
    months_in_new_role: jobChangeDate ? monthsBetween(jobChangeDate) : null,
    role_influence: INFLUENCE(get(row, ALIASES.role_influence)),
    new_company_icp_fit: Number.isFinite(icpRaw) ? Math.max(1, Math.min(5, icpRaw)) : null,
    new_company_is_existing_customer: CUSTOMER(get(row, ALIASES.existing_customer)),
    verified_email: get(row, ALIASES.email) || null,
    email_confidence: get(row, ALIASES.email_confidence).toLowerCase() || null,
    email_source: get(row, ALIASES.email_source) || null,
    linkedin_url: get(row, ALIASES.linkedin_url) || null,
    x_handle: get(row, ALIASES.x_handle) || null,
  };
}

// Stage 4 — keep only if all conditions hold. Returns { ok, reason }.
export function qualify(c, cfg) {
  const window = cfg.recencyWindowMonths ?? 12;
  if (cfg.targetProduct && c.target_product && c.target_product.toLowerCase() !== cfg.targetProduct.toLowerCase()) {
    return { ok: false, reason: `different product (${c.target_product})` };
  }
  if (!['HIGH', 'MEDIUM'].includes(c.usage_confidence)) return { ok: false, reason: 'usage evidence not HIGH/MEDIUM' };
  if (c.months_in_new_role == null) return { ok: false, reason: 'missing/invalid job_change_date' };
  if (c.months_in_new_role > window) return { ok: false, reason: `job change > ${window}mo ago` };
  if (c.new_company_is_existing_customer === 'yes') return { ok: false, reason: 'new company already a customer' };
  if (!c.role_influence) return { ok: false, reason: 'no role influence given' };

  // Geo (per mode); only enforced when a geo filter is supplied.
  const geo = cfg.geo;
  if (geo && (geo.state || geo.city)) {
    const stateOk = !geo.state || (c.location_state || '').toLowerCase() === geo.state.toLowerCase();
    const cityOk = !geo.city || (c.location_city || '').toLowerCase() === geo.city.toLowerCase();
    if (!(stateOk && cityOk)) return { ok: false, reason: 'outside geography' };
  }

  // Exclusions
  const ex = cfg.exclusions || {};
  if (ex.companies?.some((co) => co && c.current_company && c.current_company.toLowerCase() === co.toLowerCase())) {
    return { ok: false, reason: 'excluded company' };
  }
  if (ex.emails?.some((e) => e && c.verified_email && c.verified_email.toLowerCase() === e.toLowerCase())) {
    return { ok: false, reason: 'do-not-contact' };
  }
  return { ok: true, reason: '' };
}

// Stage 6 — 0-100 score.
export function score(c) {
  let s = 0;
  s += c.usage_confidence === 'HIGH' ? 35 : c.usage_confidence === 'MEDIUM' ? 20 : 0;
  const m = c.months_in_new_role;
  if (m != null) s += m <= 3 ? 20 : m <= 6 ? 15 : m <= 9 ? 10 : m <= 12 ? 5 : 0;
  s += c.role_influence === 'decision_maker' ? 20 : c.role_influence === 'influencer' ? 12 : c.role_influence === 'user' ? 6 : 0;
  if (c.new_company_icp_fit) s += Math.round((c.new_company_icp_fit / 5) * 15);
  let reach = 0;
  if (c.verified_email) reach += ['high', 'verified'].includes(c.email_confidence) ? 10 : 6;
  if (c.linkedin_url || c.x_handle) reach += 2;
  s += Math.min(10, reach);
  return Math.max(0, Math.min(100, s));
}

function outreachAngle(c) {
  const who = (c.person_name || 'They').split(' ')[0];
  const prod = c.target_product || 'the product';
  const past = c.past_company_where_product_used || 'their last company';
  const role = c.current_title || 'their new role';
  return `${who} used ${prod} at ${past} and now owns ${role} at ${c.current_company || 'the new company'} — open with continuity, not a cold pitch.`;
}

function identity(c) {
  return (c.verified_email || c.linkedin_url || `${c.person_name}|${c.current_company}`).toLowerCase();
}

/** Run the full engine over parsed CSV rows. */
export function processChampions(rows, cfg = {}) {
  const volume = cfg.volume ?? 50;
  const seen = new Set();
  const companies = new Map();
  const qualified = [];
  const quarantined = [];

  for (const raw of rows) {
    const c = normalizeChampion(raw);
    if (!c.person_name) { quarantined.push({ ...c, reason: 'no person name' }); continue; }
    const q = qualify(c, cfg);
    if (!q.ok) { quarantined.push({ ...c, reason: q.reason }); continue; }

    const id = identity(c);
    if (seen.has(id)) { quarantined.push({ ...c, reason: 'duplicate person' }); continue; }
    seen.add(id);

    c.lead_score = score(c);
    c.recommended_outreach_angle = outreachAngle(c);
    if (c.new_company_is_existing_customer === 'unknown') c.flags = ['customer status unknown'];
    const co = (c.current_company || '').toLowerCase();
    companies.set(co, (companies.get(co) || 0) + 1);
    qualified.push(c);
  }

  qualified.sort((a, b) => b.lead_score - a.lead_score);
  const leads = qualified.slice(0, volume);

  const summary = {
    candidates_scanned: rows.length,
    qualified_leads: qualified.length,
    returned: leads.length,
    quarantined: quarantined.length,
    multi_hire_companies: [...companies.entries()].filter(([, n]) => n > 1).map(([co, n]) => ({ company: co, leads: n })),
    confidence_gaps: {
      high_confidence: qualified.filter((c) => c.usage_confidence === 'HIGH').length,
      medium_confidence: qualified.filter((c) => c.usage_confidence === 'MEDIUM').length,
      missing_verified_email: qualified.filter((c) => !c.verified_email).length,
      customer_status_unknown: qualified.filter((c) => c.new_company_is_existing_customer === 'unknown').length,
    },
  };
  return { leads, quarantined, summary };
}
