'use client';
import { useRouter, usePathname } from 'next/navigation';
import { clearSession } from '@/lib/client';

export default function AppShell({ user, children }) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    clearSession();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-icon">🎯</span>
          <span className="brand-name">LeadForge</span>
        </div>
        <nav className="app-nav">
          <button className={`nav-link ${pathname === '/' ? 'active' : ''}`} onClick={() => router.push('/')}>Categories</button>
          <button className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`} onClick={() => router.push('/dashboard')}>Dashboard</button>
          {user && <span className="nav-link">{user.full_name || user.email}</span>}
          <button className="ghost-btn" onClick={logout}>Log out</button>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
