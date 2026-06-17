'use client';
import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

// PUBLIC lead-capture form. Put this link behind your ads / on your site:
//   /capture/<your-account-id>?category=real_estate
// Real submissions are delivered to that account's dashboard.
export default function CapturePage() {
  const { ownerId } = useParams();
  const searchParams = useSearchParams();
  const presetCategory = searchParams.get('category');

  const [form, setForm] = useState({
    category_id: presetCategory && CATEGORIES.some((c) => c.id === presetCategory) ? presetCategory : '',
    first_name: '', last_name: '', email: '', phone: '',
    company_name: '', city: '', state: '', notes: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/leads/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: ownerId, source: 'capture_form', ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="auth-overlay">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-logo-icon">✅</div>
          <div className="auth-logo-name">Thank you!</div>
          <p className="page-sub" style={{ marginTop: 12 }}>
            We&apos;ve received your details and will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎯</div>
          <div className="auth-logo-name">Get a callback</div>
          <div className="auth-logo-sub">Tell us what you need — no obligation.</div>
        </div>

        {status === 'error' && <div className="form-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-field">
            <label className="form-label">I&apos;m interested in</label>
            <select className="form-input" value={form.category_id} onChange={set('category_id')} required>
              <option value="" disabled>Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Full name</label>
            <input className="form-input" value={form.first_name} onChange={set('first_name')} placeholder="Your name" required />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="+1 …" />
          </div>
          <div className="form-field">
            <label className="form-label">City / State (optional)</label>
            <input className="form-input" value={form.city} onChange={set('city')} placeholder="City" />
          </div>
          <div className="form-field">
            <label className="form-label">Anything we should know? (optional)</label>
            <input className="form-input" value={form.notes} onChange={set('notes')} placeholder="Budget, timeline, etc." />
          </div>
          <button className="primary-btn" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting…' : 'Request a callback'}
          </button>
          <div className="form-hint">An email or phone number is required so we can reach you.</div>
        </form>
      </div>
    </div>
  );
}
