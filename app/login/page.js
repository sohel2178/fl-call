'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '../../components/Shell';
import { login } from '../../lib/api';

// 4×6 lamps that light once on load, like lines coming up on a panel.
const PANEL = 'ok ok rang ok down ok ok unk ok ok rang ok ok ok ok down ok ok rang ok ok ok unk ok'.split(' ');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (e2) {
      setErr(e2.message === 'invalid email or password' ? 'That email and password don’t match the admin account.' : e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="sheet" onSubmit={submit}>
        <div className="login-lamps" aria-hidden="true">
          {PANEL.map((k, i) => <span key={i} className={`lamp ${k}`} style={{ animationDelay: `${80 + i * 45}ms` }} />)}
        </div>
        <div>
          <Wordmark dark lamps={false} />
          <p className="quiet" style={{ marginTop: 4 }}>Sign in with the admin account.</p>
        </div>
        <label className="field">
          Email
          <input className="input" type="email" value={email} autoComplete="username" required
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input className="input" type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
