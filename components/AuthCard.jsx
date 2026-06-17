'use client';
import { useState, useRef } from 'react';
import { api, setSession } from '@/lib/client';

// Screens: 'login' | 'signup' | 'forgot' | 'otp' | 'reset'
export default function AuthCard({ onAuth }) {
  const [screen, setScreen] = useState('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Shared form state
  const [form, setForm] = useState({
    identifier: '', email: '', full_name: '', company_name: '',
    password: '', new_password: '',
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const reset = (next) => { setError(''); setSuccess(''); setScreen(next); };

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: form.identifier, password: form.password },
      });
      setSession(data.token, data.user);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: {
          email: form.email, full_name: form.full_name,
          company_name: form.company_name, password: form.password,
        },
      });
      setSession(data.token, data.user);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email: form.email } });
      setSuccess('If this email exists, a 6-digit code is on its way.');
      setScreen('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  function submitOtp(e) {
    e.preventDefault();
    if (otp.join('').length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setScreen('reset');
  }

  async function handleReset(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: { email: form.email, otp: otp.join(''), new_password: form.new_password },
      });
      setSuccess('Password updated. You can now log in.');
      setOtp(['', '', '', '', '', '']);
      setScreen('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🎯</div>
          <div className="auth-logo-name">LeadForge</div>
          <div className="auth-logo-sub">Qualified leads across 28 industries</div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {(screen === 'login' || screen === 'signup') && (
          <div className="auth-tabs">
            <button className={`auth-tab ${screen === 'login' ? 'on' : ''}`} onClick={() => reset('login')}>Log in</button>
            <button className={`auth-tab ${screen === 'signup' ? 'on' : ''}`} onClick={() => reset('signup')}>Sign up</button>
          </div>
        )}

        {/* ── LOGIN ── */}
        {screen === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label className="form-label">Email or phone</label>
              <input className="form-input" value={form.identifier} onChange={set('identifier')} placeholder="you@company.com" autoComplete="username" />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="current-password" />
            </div>
            <button className="primary-btn" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
            <div className="form-hint">
              <button type="button" className="link-btn" onClick={() => reset('forgot')}>Forgot password?</button>
            </div>
          </form>
        )}

        {/* ── SIGNUP ── */}
        {screen === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="form-field">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" />
            </div>
            <div className="form-field">
              <label className="form-label">Work email</label>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </div>
            <div className="form-field">
              <label className="form-label">Company (optional)</label>
              <input className="form-input" value={form.company_name} onChange={set('company_name')} placeholder="Acme Inc." />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" />
            </div>
            <button className="primary-btn" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
        )}

        {/* ── FORGOT (request OTP) ── */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgot}>
            <button type="button" className="auth-back" onClick={() => reset('login')}>← Back to log in</button>
            <div className="form-field">
              <label className="form-label">Account email</label>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
            </div>
            <button className="primary-btn" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
          </form>
        )}

        {/* ── OTP entry ── */}
        {screen === 'otp' && (
          <form onSubmit={submitOtp}>
            <button type="button" className="auth-back" onClick={() => reset('forgot')}>← Use a different email</button>
            <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
              Enter the 6-digit code sent to {form.email}
            </label>
            <div className="otp-row">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  className="otp-input"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                />
              ))}
            </div>
            <button className="primary-btn">Verify code</button>
          </form>
        )}

        {/* ── RESET password ── */}
        {screen === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="form-field">
              <label className="form-label">New password</label>
              <input className="form-input" type="password" value={form.new_password} onChange={set('new_password')} placeholder="At least 8 characters" autoComplete="new-password" />
            </div>
            <button className="primary-btn" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
