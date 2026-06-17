'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, getToken, getUser } from '@/lib/client';
import { getCategory } from '@/lib/categories';

export default function LeadDashboard({ categories = [] }) {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, converted: 0, pipeline: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [facets, setFacets] = useState({ states: [], cities: [] });
  const [filter, setFilter] = useState({ category: 'all', status: 'all', state: 'all', city: 'all', q: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [captureUrl, setCaptureUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u?.id && typeof window !== 'undefined') {
      setCaptureUrl(`${window.location.origin}/capture/${u.id}`);
    }
  }, []);

  const copyCapture = async () => {
    try {
      await navigator.clipboard.writeText(captureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        category: filter.category,
        status: filter.status,
        state: filter.state,
        city: filter.city,
        q: filter.q,
        page: String(filter.page),
      });
      const data = await api(`/api/leads?${params}`);
      setLeads(data.leads || []);
      if (data.facets) setFacets(data.facets);
      setStats(data.stats || { total: 0, thisMonth: 0, converted: 0, pipeline: 0 });
      setPagination(data.pagination || { page: 1, pages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (leadId, newStatus) => {
    await api(`/api/leads/${leadId}/status`, { method: 'PATCH', body: { status: newStatus } });
    fetchLeads();
  };

  const requestReplacement = async (leadId) => {
    await api(`/api/leads/${leadId}/replace`, { method: 'POST', body: { reason: 'not_qualified' } });
    fetchLeads();
  };

  const exportCSV = () => {
    window.location.href = `/api/leads/export?auth=${getToken()}`;
  };

  const generateSamples = async () => {
    setGenerating(true);
    setError('');
    try {
      await api('/api/leads/generate', {
        method: 'POST',
        body: { count: 40, category_ids: categories },
      });
      await fetchLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const clearLeads = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Delete all leads on your account? This cannot be undone.')) return;
    setGenerating(true);
    setError('');
    try {
      await api('/api/leads/clear', { method: 'POST' });
      await fetchLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const fileRef = useRef(null);
  const [importMsg, setImportMsg] = useState('');

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    setGenerating(true);
    setError('');
    setImportMsg('');
    try {
      const csv = await file.text();
      // Default category for rows with no category column: current filter, else first selected.
      const defaultCategory = filter.category !== 'all' ? filter.category : categories[0];
      const result = await api('/api/leads/import', { method: 'POST', body: { csv, default_category: defaultCategory } });
      setImportMsg(`Imported ${result.imported} lead${result.imported === 1 ? '' : 's'}${result.skipped ? ` · skipped ${result.skipped} (missing name or email/phone)` : ''}.`);
      await fetchLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,phone,company_name,job_title,city,state,category,notes\n'
      + 'Dana,Reed,dana.reed@northwind.com,+14155550101,Northwind Solar,Owner,San Diego,CA,solar_energy,Wants rooftop quote\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'leadforge-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const setF = (k, v) => setFilter((p) => ({ ...p, [k]: v, page: k === 'page' ? v : 1 }));

  return (
    <div className="lead-dashboard">
      {/* KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi"><div className="kpi-n">{stats.total}</div><div className="kpi-l">Total leads</div></div>
        <div className="kpi"><div className="kpi-n">{stats.thisMonth}</div><div className="kpi-l">This month</div></div>
        <div className="kpi"><div className="kpi-n">{stats.converted}</div><div className="kpi-l">Converted</div></div>
        <div className="kpi"><div className="kpi-n">${Number(stats.pipeline).toLocaleString()}</div><div className="kpi-l">Pipeline value</div></div>
      </div>

      {/* Real lead-capture link */}
      {captureUrl && (
        <div className="capture-panel">
          <div>
            <div className="capture-title">📥 Your real lead-capture link</div>
            <div className="capture-sub">Put this behind your ads or on your site. Real people who submit land here as new leads.</div>
            <code className="capture-url">{captureUrl}</code>
          </div>
          <div className="capture-actions">
            <button className="action-btn" onClick={copyCapture}>{copied ? 'Copied ✓' : 'Copy link'}</button>
            <a className="action-btn" href={captureUrl} target="_blank" rel="noreferrer">Preview form ↗</a>
          </div>
        </div>
      )}

      {/* Filters + Export */}
      <div className="lead-filter-bar">
        <input
          className="cat-search"
          style={{ minWidth: 180 }}
          placeholder="Search name, company, email…"
          value={filter.q}
          onChange={(e) => setF('q', e.target.value)}
        />
        <select value={filter.category} onChange={(e) => setF('category', e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((id) => (
            <option key={id} value={id}>{getCategory(id)?.name || id}</option>
          ))}
        </select>
        <select value={filter.state} onChange={(e) => setF('state', e.target.value)}>
          <option value="all">All states</option>
          {facets.states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.city} onChange={(e) => setF('city', e.target.value)}>
          <option value="all">All cities</option>
          {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setF('status', e.target.value)}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
        </select>
        <button className="action-btn" onClick={() => fileRef.current?.click()} disabled={generating} style={{ marginLeft: 'auto' }}>
          ⬆ Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onImportFile} />
        <button className="action-btn" onClick={generateSamples} disabled={generating}>
          {generating ? 'Working…' : '✨ Generate demo'}
        </button>
        {stats.total > 0 && (
          <button className="action-btn" onClick={clearLeads} disabled={generating}>🗑 Clear leads</button>
        )}
        <button className="export-btn" style={{ marginLeft: 0 }} onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      <div className="import-note">
        Real data: <strong>⬆ Import CSV</strong> from a list or anywhere, or use <strong>Find contacts</strong> for free businesses.{' '}
        <button className="link-btn" onClick={downloadTemplate}>Download template</button>. Rows without a category use{' '}
        {filter.category !== 'all' ? getCategory(filter.category)?.name : (getCategory(categories[0])?.name || 'your first category')}.
      </div>

      {importMsg && <div className="form-success">{importMsg}</div>}
      {error && <div className="form-error">{error}</div>}

      {leads.some((l) => l.source === 'demo_sample') && (
        <div className="demo-hint">
          ⚠️ Rows marked <strong>DEMO</strong> are sample data (note the <code>@example.com</code> addresses) — not real leads.
          Click <strong>🗑 Clear leads</strong> to remove them, then share your capture link above to collect real ones.
        </div>
      )}

      {/* Lead table */}
      <div className="lead-table-wrap">
        <table className="lead-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Category</th>
              <th>Contact</th>
              <th>City</th>
              <th>State</th>
              <th>Intent Score</th>
              <th>Received</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <div className="lead-name">
                    {lead.first_name} {lead.last_name}
                    {lead.source === 'demo_sample' && <span className="demo-badge" title="Sample data, not a real lead">DEMO</span>}
                  </div>
                  <div className="lead-company">{lead.company_name || lead.job_title}</div>
                </td>
                <td><span className="lead-cat-badge">{getCategory(lead.category_id)?.name || lead.category_id?.replace(/_/g, ' ')}</span></td>
                <td>
                  <div>{lead.email}</div>
                  <div className="lead-phone">{lead.phone}</div>
                </td>
                <td>{lead.city || '—'}</td>
                <td>{lead.state || '—'}</td>
                <td>
                  <span className={`intent-bar ${lead.intent_score > 70 ? 'high' : lead.intent_score > 40 ? 'med' : 'low'}`}>
                    {lead.intent_score}/100
                  </span>
                </td>
                <td>{new Date(lead.delivered_at).toLocaleDateString()}</td>
                <td>
                  <select value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value)} className="status-select">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted ✓</option>
                    <option value="rejected">Not relevant</option>
                  </select>
                </td>
                <td>
                  <button className="action-btn" onClick={() => requestReplacement(lead.id)}>Replace</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && !loading && (
        <div className="empty-leads">
          <div className="empty-icon">🎯</div>
          <div>No leads yet. Your first batch will arrive within 24 hours of subscribing.</div>
          <button className="primary-btn" style={{ width: 'auto', marginTop: 18, padding: '10px 20px' }} onClick={generateSamples} disabled={generating}>
            {generating ? 'Generating…' : '✨ Generate sample leads'}
          </button>
          <div className="page-sub" style={{ marginTop: 8 }}>Populates your dashboard with demo leads so you can explore the product.</div>
        </div>
      )}

      {loading && <div className="spinner-wrap">Loading leads…</div>}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="ghost-btn" disabled={filter.page <= 1} onClick={() => setF('page', filter.page - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button className="ghost-btn" disabled={filter.page >= pagination.pages} onClick={() => setF('page', filter.page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
