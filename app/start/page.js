'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import AppShell from '@/components/AppShell';
import CategorySelector from '@/components/CategorySelector';
import { api, getToken, getUser } from '@/lib/client';

// The authenticated entry point: log in / sign up, then pick categories → checkout.
export default function StartPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (getToken()) setUser(getUser() || { email: 'account' });
    setReady(true);
  }, []);

  async function handleProceed(categoryIds, billingCycle) {
    setWorking(true);
    setNotice('');
    try {
      await api('/api/categories/select', {
        method: 'PUT',
        body: { category_ids: categoryIds, billing_cycle: billingCycle },
      });
      try {
        const checkout = await api('/api/billing/create-checkout', {
          method: 'POST',
          body: { category_ids: categoryIds, billing_cycle: billingCycle, return_url: `${window.location.origin}/dashboard` },
        });
        if (checkout?.checkout_url) { window.location.href = checkout.checkout_url; return; }
      } catch (err) {
        if (err.status !== 503) throw err;
        setNotice('Selection saved. (Billing is not configured in this environment — opening your dashboard.)');
      }
      router.push('/dashboard');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setWorking(false);
    }
  }

  if (!ready) return null;
  if (!user) return <AuthCard onAuth={(u) => setUser(u)} />;

  return (
    <AppShell user={user}>
      <div className="page-head">
        <h1 className="page-title">Choose your lead categories</h1>
        <p className="page-sub">Pick the industries you want leads from. Pricing adapts in real-time — more categories, better per-category rate.</p>
      </div>
      {notice && <div className="form-success">{notice}</div>}
      {working && <div className="form-hint">Processing your selection…</div>}
      <CategorySelector onProceed={handleProceed} />
    </AppShell>
  );
}
