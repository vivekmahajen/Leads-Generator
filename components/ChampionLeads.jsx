'use client';
import { useState, useRef } from 'react';
import { api } from '@/lib/client';

const TEMPLATE_HEADERS = [
  'person_name', 'current_title', 'current_company', 'current_company_domain',
  'location_city', 'location_state', 'past_company_where_product_used', 'target_product',
  'usage_confidence', 'usage_evidence', 'job_change_date', 'role_influence',
  'new_company_icp_fit', 'new_company_is_existing_customer', 'verified_email',
  'email_confidence', 'email_source', 'linkedin_url', 'x_handle',
];
const TEMPLATE_ROW = [
  'John Doe', 'Head of Platform', 'NewCo', 'newco.com', 'Austin', 'TX', 'OldCo', 'Datadog',
  'HIGH', 'Listed Datadog under skills :: https://linkedin.com/in/johndoe', '2026-03-01',
  'decision_maker', '5', 'no', '', '', '', 'https://linkedin.com/in/johndoe', '@johndoe',
];

const ConfBadge = ({ v }) => <span className={`score-badge score-${v === 'HIGH' ? 'danger' : v === 'MEDIUM' ? 'warning' : 'secondary'}`}>{v || '—'}</span>;

function downloadBlob(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function ChampionLeads() {
  const fileRef = useRef(null);
  const [cfg, setCfg] = useState({ targetProduct: '', recencyWindowMonths: 12, volume: 50, state: '', city: '', exCompanies: '', exEmails: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setCfg((p) => ({ ...p, [k]: e.target.value }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const csv = await file.text();
      const config = {
        targetProduct: cfg.targetProduct,
        recencyWindowMonths: cfg.recencyWindowMonths,
        volume: cfg.volume,
        geo: (cfg.state || cfg.city) ? { state: cfg.state.trim(), city: cfg.city.trim() } : null,
        exclusions: {
          companies: cfg.exCompanies.split(',').map((s) => s.trim()).filter(Boolean),
          emails: cfg.exEmails.split(',').map((s) => s.trim()).filter(Boolean),
        },
      };
      const data = await api('/api/champion/score', { method: 'POST', body: { csv, config } });
      setResult(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(',') + '\n' + TEMPLATE_ROW.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',') + '\n';
    downloadBlob(csv, 'text/csv', 'champion-leads-template.csv');
  };
  const downloadJson = () => downloadBlob(JSON.stringify(result.leads, null, 2), 'application/json', 'champion-leads.json');
  const downloadCsv = () => {
    const cols = ['lead_score', 'person_name', 'current_title', 'current_company', 'current_company_domain', 'location_city', 'location_state', 'past_company_where_product_used', 'target_product', 'usage_confidence', 'job_change_date', 'months_in_new_role', 'role_influence', 'new_company_icp_fit', 'new_company_is_existing_customer', 'verified_email', 'email_confidence', 'linkedin_url', 'x_handle', 'recommended_outreach_angle'];
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(','), ...result.leads.map((l) => cols.map((c) => esc(l[c])).join(','))].join('\n');
    downloadBlob(csv, 'text/csv', 'champion-leads.csv');
  };

  return (
    <div className="lead-dashboard">
      <div className="capture-panel" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="capture-title">Champion job-change leads</div>
          <div className="capture-sub">Upload candidate people + their past-company / product-usage / job-change data (CSV). The engine flags fresh job changes, qualifies champions, scores 0–100, dedupes, and ranks. <button className="link-btn" onClick={downloadTemplate}>Download template</button>.</div>
          <div className="champion-cfg">
            <input className="form-input" placeholder="Target product (e.g. Datadog)" value={cfg.targetProduct} onChange={set('targetProduct')} />
            <input className="form-input" type="number" min="1" max="36" title="Recency window (months)" value={cfg.recencyWindowMonths} onChange={set('recencyWindowMonths')} />
            <input className="form-input" type="number" min="1" title="Max leads" value={cfg.volume} onChange={set('volume')} />
            <input className="form-input" placeholder="State (opt)" value={cfg.state} onChange={set('state')} />
            <input className="form-input" placeholder="City (opt)" value={cfg.city} onChange={set('city')} />
            <input className="form-input" placeholder="Exclude companies (comma)" value={cfg.exCompanies} onChange={set('exCompanies')} />
            <input className="form-input" placeholder="Do-not-contact emails (comma)" value={cfg.exEmails} onChange={set('exEmails')} />
          </div>
        </div>
        <div className="capture-actions">
          <button className="export-btn" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Scoring…' : '⬆ Upload candidates CSV'}</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <>
          <div className="kpi-strip">
            <div className="kpi"><div className="kpi-n">{result.summary.candidates_scanned}</div><div className="kpi-l">Scanned</div></div>
            <div className="kpi"><div className="kpi-n">{result.summary.qualified_leads}</div><div className="kpi-l">Qualified</div></div>
            <div className="kpi"><div className="kpi-n">{result.summary.confidence_gaps.high_confidence}</div><div className="kpi-l">HIGH confidence</div></div>
            <div className="kpi"><div className="kpi-n">{result.summary.quarantined}</div><div className="kpi-l">Quarantined</div></div>
          </div>

          <div className="lead-filter-bar">
            <div className="page-sub" style={{ marginRight: 'auto' }}>
              {result.summary.missing_verified_email != null && (
                <>Gaps: {result.summary.confidence_gaps.missing_verified_email} missing email · {result.summary.confidence_gaps.customer_status_unknown} customer-status unknown
                {result.summary.multi_hire_companies.length ? ` · multi-hire: ${result.summary.multi_hire_companies.map((m) => m.company).join(', ')}` : ''}</>
              )}
            </div>
            <button className="action-btn" onClick={downloadJson}>⬇ JSON</button>
            <button className="action-btn" onClick={downloadCsv}>⬇ CSV</button>
          </div>

          <div className="lead-table-wrap">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>Score</th><th>Champion</th><th>New company</th><th>Location</th>
                  <th>Signal (past → product)</th><th>Recency</th><th>Influence</th><th>Email</th>
                </tr>
              </thead>
              <tbody>
                {result.leads.map((l, i) => (
                  <tr key={i}>
                    <td><span className={`intent-bar ${l.lead_score > 70 ? 'high' : l.lead_score > 40 ? 'med' : 'low'}`}>{l.lead_score}</span></td>
                    <td>
                      <div className="lead-name">{l.person_name}</div>
                      <div className="lead-company">{l.current_title}</div>
                      <div className="lead-company" title={l.recommended_outreach_angle} style={{ maxWidth: 260, fontStyle: 'italic' }}>{l.recommended_outreach_angle}</div>
                    </td>
                    <td>
                      <div>{l.current_company}</div>
                      <div className="lead-company">{l.current_company_domain} · ICP {l.new_company_icp_fit || '—'}/5 · {l.new_company_is_existing_customer === 'unknown' ? 'cust?' : l.new_company_is_existing_customer}</div>
                    </td>
                    <td>{[l.location_city, l.location_state].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      <div>{l.past_company_where_product_used} → <strong>{l.target_product}</strong> <ConfBadge v={l.usage_confidence} /></div>
                      {l.usage_evidence?.slice(0, 2).map((e, j) => e.source_url && <a key={j} className="lead-company" href={e.source_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>↗ {e.claim || 'evidence'}</a>)}
                    </td>
                    <td>{l.job_change_date || '—'}<div className="lead-company">{l.months_in_new_role != null ? `${l.months_in_new_role} mo` : ''}</div></td>
                    <td>{l.role_influence?.replace('_', ' ')}</td>
                    <td>{l.verified_email ? <div>{l.verified_email}<div className="lead-company">{l.email_confidence || ''}</div></div> : <span className="lead-company">— no verified email</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
