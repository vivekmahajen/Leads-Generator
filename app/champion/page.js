'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ChampionLeads from '@/components/ChampionLeads';
import { getToken, getUser } from '@/lib/client';

export default function ChampionPage() {
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
        <h1 className="page-title">Champion leads</h1>
        <p className="page-sub">Find warm champions: people who used a product at a past company and just moved to a new one. Bring the candidate data (CSV); the engine qualifies, scores and ranks.</p>
      </div>
      <ChampionLeads />
    </AppShell>
  );
}
