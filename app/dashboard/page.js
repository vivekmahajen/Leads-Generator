'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import LeadDashboard from '@/components/LeadDashboard';
import { getToken, getUser } from '@/lib/client';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    setUser(getUser() || { email: 'account' });
    try {
      const saved = JSON.parse(localStorage.getItem('lf_selected_categories') || '[]');
      if (Array.isArray(saved)) setCategories(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <AppShell user={user}>
      <div className="page-head">
        <h1 className="page-title">Lead dashboard</h1>
        <p className="page-sub">Track, qualify and export the leads delivered to your account.</p>
      </div>
      <LeadDashboard categories={categories} />
    </AppShell>
  );
}
