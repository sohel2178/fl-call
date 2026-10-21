'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { health, logout } from '../lib/api';

export function Wordmark({ dark = false, lamps = true }) {
  return (
    <span className={`wordmark${dark ? ' dark' : ''}`}>
      {lamps && <span className="wordmark-lamps" aria-hidden="true"><i /><i /><i /><i /></span>}
      FleetCall
    </span>
  );
}

function BackendStatus() {
  const [hp, setHp] = useState(null);
  useEffect(() => {
    const check = () => health().then(setHp).catch(() => setHp({ ok: false }));
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);
  if (!hp) return null;
  const live = hp.ok && hp.driver === 'ari';
  const text = !hp.ok ? 'Backend offline' : live ? `Live calling, ${hp.concurrency} lines` : 'Simulated calls (mock)';
  return (
    <div className="rail-status" title={text}>
      <span className={`lamp ${!hp.ok ? 'down' : live ? 'ok' : 'rang'}`} aria-hidden="true" />
      <span className="status-text">{text}</span>
    </div>
  );
}

/** App frame: ink rail (top bar on mobile) + page heading + content. */
export default function Shell({ title, lede, actions, children }) {
  const pathname = usePathname();
  const isCampaigns = pathname === '/' || pathname.startsWith('/campaigns');
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="wordmark" aria-label="FleetCall home"><Wordmark /></Link>
        <nav aria-label="Main">
          <Link href="/" className="rail-link" aria-current={isCampaigns ? 'page' : undefined}>Campaigns</Link>
          <Link href="/pbx" className="rail-link" aria-current={pathname === '/pbx' ? 'page' : undefined}>PBX</Link>
          <Link href="/pbx2" className="rail-link" aria-current={pathname === '/pbx2' ? 'page' : undefined}>PBX-2</Link>
        </nav>
        <div className="rail-foot">
          <BackendStatus />
          <button className="btn-link" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <header className="page-head">
          <div>
            <h1>{title}</h1>
            {lede && <p className="lede">{lede}</p>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}
