'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '../lib/api';

// Sends visitors without a login token to /login. The backend still checks
// every request; this only avoids flashing pages that would fail anyway.
export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname.startsWith('/login');
  const [ok, setOk] = useState(isLogin);

  useEffect(() => {
    if (isLogin) { setOk(true); return; }
    if (getToken()) setOk(true);
    else router.replace('/login');
  }, [pathname, isLogin, router]);

  return ok ? children : null;
}
