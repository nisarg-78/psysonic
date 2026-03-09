import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ping } from '../api/subsonic';

const PsysonicLogo = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="18" fill="url(#grad-login)" />
    <text x="8" y="47" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="42" fill="white">P</text>
    <line x1="40" y1="18" x2="58" y2="18" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.9"/>
    <line x1="37" y1="26" x2="58" y2="26" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.75"/>
    <line x1="40" y1="34" x2="58" y2="34" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.9"/>
    <line x1="37" y1="42" x2="58" y2="42" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.6"/>
    <line x1="42" y1="50" x2="58" y2="50" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.4"/>
    <defs>
      <linearGradient id="grad-login" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#cba6f7"/>
        <stop offset="1" stopColor="#89b4fa"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const { setCredentials, setLoggedIn, setConnecting, setConnectionError, connectionError } = useAuthStore();

  const [form, setForm] = useState({
    serverName: '',
    lanIp: '',
    externalUrl: '',
    username: '',
    password: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lanIp && !form.externalUrl) {
      setTestMessage('Bitte LAN-IP oder externe URL eingeben.');
      setStatus('error');
      return;
    }

    setStatus('testing');
    setTestMessage('Verbinde…');
    setConnecting(true);
    setCredentials(form);
    setConnectionError(null);

    // Small delay to let store update
    await new Promise(r => setTimeout(r, 100));

    const ok = await ping();
    setConnecting(false);

    if (ok) {
      setLoggedIn(true);
      setStatus('ok');
      setTestMessage('Verbunden!');
      setTimeout(() => navigate('/'), 600);
    } else {
      setStatus('error');
      setConnectionError('Verbindung fehlgeschlagen – bitte Daten prüfen.');
      setTestMessage('Verbindung fehlgeschlagen.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true" />
      <div className="login-card animate-fade-in">
        <div className="login-logo">
          <PsysonicLogo />
        </div>
        <h1 className="login-title">Psysonic</h1>
        <p className="login-subtitle">Dein Navidrome Desktop Player</p>

        <form className="login-form" onSubmit={handleConnect} noValidate>
          <div className="form-group">
            <label htmlFor="login-server-name">Server-Name (optional)</label>
            <input
              id="login-server-name"
              className="input"
              type="text"
              placeholder="Mein Navidrome"
              value={form.serverName}
              onChange={update('serverName')}
              autoComplete="off"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="login-lan-ip">LAN-IP / URL</label>
              <input
                id="login-lan-ip"
                className="input"
                type="text"
                placeholder="192.168.1.100:4533"
                value={form.lanIp}
                onChange={update('lanIp')}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-external-url">Externe URL (FQDN)</label>
              <input
                id="login-external-url"
                className="input"
                type="text"
                placeholder="music.example.com"
                value={form.externalUrl}
                onChange={update('externalUrl')}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="login-username">Benutzername</label>
              <input
                id="login-username"
                className="input"
                type="text"
                placeholder="admin"
                value={form.username}
                onChange={update('username')}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Passwort</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Passwort verstecken' : 'Passwort anzeigen'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {testMessage && (
            <div className={`login-status login-status--${status}`} role="alert">
              {status === 'testing' && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
              {status === 'ok' && <Wifi size={16} />}
              {status === 'error' && <WifiOff size={16} />}
              <span>{testMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '15px' }}
            id="login-connect-btn"
            disabled={status === 'testing'}
          >
            {status === 'testing' ? 'Verbinde…' : 'Verbinden'}
          </button>
        </form>
      </div>
    </div>
  );
}
