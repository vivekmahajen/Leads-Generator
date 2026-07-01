'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Sequences from '@/components/Sequences';
import { getToken, getUser } from '@/lib/client';

export default function SequencesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    setUser(getUser() || { email: 'account' });
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <AppShell user={user}>
      <div className="page-head">
        <h1 className="page-title">Sequences</h1>
        <p className="page-sub">Build multi-step email cadences and enroll leads from the dashboard. Replies auto-qualify; bounces and unsubscribes auto-suppress.</p>
      </div>
      <Sequences />
    </AppShell>
  );
}
