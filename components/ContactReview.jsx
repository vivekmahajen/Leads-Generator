'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/client';
import { getScoreLabel } from '@/lib/scoring';
import { getCategory, CATEGORIES } from '@/lib/categories';
import { parseCSV } from '@/lib/csv';

const PLATFORM_LABEL = { osm: '📍 Local business', linkedin: '💼 LinkedIn', twitter: '𝕏 Twitter' };

export default function ContactReview({ categories = [] }) {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState({ platform: 'all', minScore: 0, emailStatus: 'all' });
  const [category, setCategory] = useState(categories[0] || 'real_estate');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ platform: filter.platform, minScore: String(filter.minScore), emailStatus: filter.emailStatus });
      const data = await api(`/api/contacts?${params}`);
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const toggle = (id) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const runLocal = async () => {
    if (!location.trim()) { setError('Enter a location, e.g. "Austin, TX".'); return; }
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await api('/api/scrape/local/search', { method: 'POST', body: { category_id: category, location } });
      setMsg(`Found ${r.found} real businesses near ${r.location || location} — ${r.added} new, ${r.duplicates} already had.`);
      await fetchContacts();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setMsg(''); setError('');
    try {
      const text = await file.text();
      const contactsArr = parseCSV(text);
      const r = await api('/api/scrape/linkedin/upload', { method: 'POST', body: { contacts: contactsArr, categoryId: category, sourceType: 'people_search' } });
      setMsg(`LinkedIn import: ${r.added} new, ${r.duplicates} duplicate, ${r.failed} failed.`);
      await fetchContacts();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const enrich = async (id) => {
    setBusy(true); setError('');
    try { await api(`/api/contacts/${id}/enrich`, { method: 'POST' }); await fetchContacts(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const promote = async () => {
    setBusy(true); setMsg(''); setError('');
    try {
      const r = await api('/api/contacts/promote', { method: 'POST', body: { contactIds: [...selected] } });
      setMsg(`Promoted ${r.promoted} contact(s) to the leads pipeline.`);
      setSelected(new Set());
      await fetchContacts();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const catOptions = categories.length ? categories : CATEGORIES.map((c) => c.id);

  return (
    <div className="lead-dashboard">
      <div className="capture-panel">
        <div>
          <div className="capture-title">Find real businesses — free</div>
          <div className="capture-sub">Pull real local businesses (name, phone, website, address) from OpenStreetMap by category + location. No API key, no cost. Or upload a LinkedIn export. Everything is scored, deduped, and lands here for review.</div>
        </div>
        <div className="capture-actions" style={{ flexWrap: 'wrap' }}>
          <select className="status-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {catOptions.map((id) => <option key={id} value={id}>{getCategory(id)?.name || id}</option>)}
          </select>
          <input className="cat-search" style={{ minWidth: 160 }} placeholder="City, State" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button className="action-btn" onClick={runLocal} disabled={busy}>📍 Find businesses</button>
          <button className="action-btn" onClick={() => fileRef.current?.click()} disabled={busy}>💼 Upload LinkedIn CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onUpload} />
        </div>
      </div>

      {msg && <div className="form-success">{msg}</div>}
      {error && <div className="form-error">{error}</div>}

      <div className="lead-filter-bar">
        <select value={filter.platform} onChange={(e) => setFilter((p) => ({ ...p, platform: e.target.value }))}>
          <option value="all">All sources</option>
          <option value="osm">📍 Local business</option>
          <option value="linkedin">💼 LinkedIn</option>
        </select>
        <select value={filter.minScore} onChange={(e) => setFilter((p) => ({ ...p, minScore: Number(e.target.value) }))}>
          <option value={0}>Any intent</option>
          <option value={60}>60+ (Warm)</option>
          <option value={75}>75+ (Hot)</option>
          <option value={85}>85+ (Very hot)</option>
        </select>
        <select value={filter.emailStatus} onChange={(e) => setFilter((p) => ({ ...p, emailStatus: e.target.value }))}>
          <option value="all">Any email status</option>
          <option value="verified">Email verified</option>
          <option value="found">Email found</option>
          <option value="pending">No email yet</option>
        </select>
        {selected.size > 0 && (
          <button className="export-btn" onClick={promote} disabled={busy}>→ Promote {selected.size} to leads</button>
        )}
      </div>

      <div className="lead-table-wrap">
        <table className="lead-table">
          <thead>
            <tr>
              <th><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(contacts.map((c) => c.id)) : new Set())} /></th>
              <th>Name</th><th>Platform</th><th>Signal</th><th>Email</th><th>Intent</th><th>Profile</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const s = getScoreLabel(c.intentScore);
              return (
                <tr key={c.id}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                  <td>
                    <div className="lead-name">{c.fullName || `${c.firstName || ''} ${c.lastName || ''}`}</div>
                    <div className="lead-company">{[c.jobTitle, c.companyName].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>
                    <span className={`platform-pill ${c.sourcePlatform}`}>{PLATFORM_LABEL[c.sourcePlatform] || c.sourcePlatform}</span>
                    <div className="lead-company">{c.sourceType?.replace(/_/g, ' ')}</div>
                  </td>
                  <td>
                    {c.sourceTweetText
                      ? <div className="tweet-preview" title={c.sourceTweetText}>“{c.sourceTweetText.slice(0, 70)}…”</div>
                      : <div className="lead-company">{c.sourceKeyword || c.city}</div>}
                  </td>
                  <td>
                    {c.email
                      ? <div><div>{c.email}</div><div className="lead-company">{c.emailSource} · {c.emailVerified ? '✓ verified' : 'unverified'}</div></div>
                      : <button className="action-btn" onClick={() => enrich(c.id)} disabled={busy}>Find email</button>}
                  </td>
                  <td><span className={`score-badge score-${s.color}`}>{c.intentScore} · {s.label}</span></td>
                  <td>{c.profileUrl ? <a className="action-btn" href={c.profileUrl} target="_blank" rel="noreferrer">View ↗</a> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {contacts.length === 0 && !loading && (
        <div className="empty-leads">
          <div className="empty-icon">🔎</div>
          <div>No contacts yet. Run an X intent search or upload a LinkedIn export to get started.</div>
        </div>
      )}
      {loading && <div className="spinner-wrap">Loading…</div>}
    </div>
  );
}
