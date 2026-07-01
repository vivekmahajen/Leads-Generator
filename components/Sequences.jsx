'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/client';

const emptyStep = () => ({ subject: '', body: '', delay_hours: 0 });

export default function Sequences() {
  const [sequences, setSequences] = useState([]);
  const [domain, setDomain] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [suppressions, setSuppressions] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState({ name: '', from_name: '', from_email: '', footer_address: '', region: 'US', steps: [emptyStep()] });

  const load = useCallback(async () => {
    try {
      const [seq, sup] = await Promise.all([api('/api/sequences'), api('/api/outreach/suppressions')]);
      setSequences(seq.sequences || []);
      setDomain(seq.outreach_domain);
      setEntitlement(seq.entitlement);
      setSuppressions(sup.suppressions || []);
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setStep = (i, k) => (e) => setForm((p) => ({ ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, [k]: e.target.value } : s)) }));
  const addStep = () => setForm((p) => ({ ...p, steps: [...p.steps, emptyStep()] }));
  const removeStep = (i) => setForm((p) => ({ ...p, steps: p.steps.filter((_, j) => j !== i) }));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      await api('/api/sequences', { method: 'POST', body: form });
      setMsg('Sequence created.');
      setForm({ name: '', from_name: '', from_email: '', footer_address: '', region: 'US', steps: [emptyStep()] });
      setShowBuilder(false);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const setStatus = async (id, status) => { await api(`/api/sequences/${id}`, { method: 'PATCH', body: { status } }); load(); };

  const addSuppression = async () => {
    const email = prompt('Email to suppress (never send to it again):');
    if (!email) return;
    try { await api('/api/outreach/suppressions', { method: 'POST', body: { email } }); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div className="lead-dashboard">
      <div className="capture-panel" style={{ alignItems: 'center' }}>
        <div>
          <div className="capture-title">Email sequences</div>
          <div className="capture-sub">
            Sending from <strong>{domain ? `@${domain}` : 'the outreach domain (set OUTREACH_FROM_DOMAIN)'}</strong>, separate from your app/OTP domain.
            {entitlement && <> · {entitlement.remainingMonth}/{entitlement.monthly} sends left this month ({entitlement.tier}) · {entitlement.remainingToday} today.</>}
          </div>
        </div>
        <div className="capture-actions">
          <button className="export-btn" onClick={() => setShowBuilder((v) => !v)}>{showBuilder ? 'Close' : '➕ New sequence'}</button>
        </div>
      </div>

      {msg && <div className="form-success">{msg}</div>}
      {error && <div className="form-error">{error}</div>}

      {showBuilder && (
        <form onSubmit={create} className="lead-table-wrap" style={{ padding: 16, marginBottom: 20 }}>
          <div className="champion-cfg">
            <input className="form-input" placeholder="Sequence name" value={form.name} onChange={set('name')} required />
            <input className="form-input" placeholder="From name" value={form.from_name} onChange={set('from_name')} required />
            <input className="form-input" placeholder={`From email${domain ? ` (@${domain})` : ''}`} value={form.from_email} onChange={set('from_email')} required />
            <select className="form-input" value={form.region} onChange={set('region')} title="Default region"><option value="US">US</option><option value="EU">EU</option><option value="IN">IN</option></select>
          </div>
          <input className="form-input" style={{ marginTop: 8 }} placeholder="Physical mailing address (required, CAN-SPAM footer)" value={form.footer_address} onChange={set('footer_address')} required />

          {form.steps.map((s, i) => (
            <div key={i} className="seq-step">
              <div className="lead-company">Step {i + 1}{i > 0 && <> · wait <input className="form-input seq-delay" type="number" min="0" value={s.delay_hours} onChange={setStep(i, 'delay_hours')} /> hours</>}{form.steps.length > 1 && <button type="button" className="link-btn" style={{ marginLeft: 8 }} onClick={() => removeStep(i)}>remove</button>}</div>
              <input className="form-input" placeholder="Subject — use {{firstName}}, {{company}}…" value={s.subject} onChange={setStep(i, 'subject')} required />
              <textarea className="form-input" rows={4} placeholder="Body — merge fields: {{firstName}} {{company}} {{city}}…" value={s.body} onChange={setStep(i, 'body')} required />
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="action-btn" onClick={addStep}>+ Add step</button>
            <button className="export-btn" style={{ marginLeft: 8 }} disabled={busy}>{busy ? 'Saving…' : 'Create sequence'}</button>
          </div>
          <div className="import-note" style={{ marginTop: 8 }}>Every send auto-appends a one-click unsubscribe + your address. Suppressed, unverified, and EU/India (no-basis) leads are skipped.</div>
        </form>
      )}

      {sequences.map((s) => (
        <div key={s.id} className="lead-table-wrap" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="lead-name">{s.name} <span className={`score-badge score-${s.status === 'active' ? 'warning' : 'secondary'}`}>{s.status}</span></div>
              <div className="lead-company">{s.steps.length} steps · from {s.fromName} &lt;{s.fromEmail}&gt; · {s.enrollments} enrolled</div>
            </div>
            <div className="capture-actions">
              {s.status !== 'active' && <button className="action-btn" onClick={() => setStatus(s.id, 'active')}>Activate</button>}
              {s.status !== 'archived' && <button className="action-btn" onClick={() => setStatus(s.id, 'archived')}>Archive</button>}
            </div>
          </div>
          <div className="lead-company" style={{ marginTop: 6 }}>
            sent {s.stats.sent || 0} · delivered {s.stats.delivered || 0} · replied {s.stats.replied || 0} · bounced {s.stats.bounced || 0} · failed {s.stats.failed || 0}
          </div>
        </div>
      ))}

      <div className="capture-panel" style={{ marginTop: 16 }}>
        <div>
          <div className="capture-title">Suppression list ({suppressions.length})</div>
          <div className="capture-sub">Never emailed again. {suppressions.slice(0, 8).map((s) => `${s.email} (${s.reason})`).join(', ') || 'None yet.'}</div>
        </div>
        <div className="capture-actions"><button className="action-btn" onClick={addSuppression}>+ Add email</button></div>
      </div>
    </div>
  );
}
