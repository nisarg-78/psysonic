import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi, WifiOff, Globe, Server, Music2, Sliders, LogOut, CheckCircle2, FolderOpen, Palette
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { ping } from '../api/subsonic';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const auth = useAuthStore();
  const theme = useThemeStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [lanIp, setLanIp] = useState(auth.lanIp);
  const [externalUrl, setExternalUrl] = useState(auth.externalUrl);
  const [connStatus, setConnStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  const [lfmApiKey, setLfmApiKey] = useState(auth.lastfmApiKey);
  const [lfmSecret, setLfmSecret] = useState(auth.lastfmApiSecret);
  const testConnection = async () => {
    setConnStatus('testing');
    auth.setCredentials({ serverName: auth.serverName, lanIp, externalUrl, username: auth.username, password: auth.password });
    await new Promise(r => setTimeout(r, 100));
    const ok = await ping();
    setConnStatus(ok ? 'ok' : 'error');
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const pickDownloadFolder = async () => {
    const selected = await openDialog({ directory: true, multiple: false, title: t('settings.pickFolderTitle') });
    if (selected && typeof selected === 'string') {
      auth.setDownloadFolder(selected);
    }
  };

  return (
    <div className="content-body animate-fade-in">
      <h1 className="page-title" style={{ marginBottom: '2rem' }}>{t('settings.title')}</h1>

      {/* Language */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Globe size={18} />
          <h2>{t('settings.language')}</h2>
        </div>
        <div className="settings-card">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <select 
              className="input" 
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              aria-label={t('settings.language')}
            >
              <option value="en">{t('settings.languageEn')}</option>
              <option value="de">{t('settings.languageDe')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Palette size={18} />
          <h2>{t('settings.theme')}</h2>
        </div>
        <div className="settings-card">
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <select 
              className="input" 
              value={theme.theme} 
              onChange={(e) => theme.setTheme(e.target.value as any)}
              aria-label={t('settings.theme')}
            >
              <option value="mocha">Catppuccin Mocha (Dark)</option>
              <option value="latte">Catppuccin Latte (Light)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Connection */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Wifi size={18} />
          <h2>{t('settings.connection')}</h2>
        </div>
        <div className="settings-card">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="settings-lan">{t('settings.lanIp')}</label>
              <input id="settings-lan" className="input" value={lanIp} onChange={e => setLanIp(e.target.value)} placeholder="192.168.1.100:4533" />
            </div>
            <div className="form-group">
              <label htmlFor="settings-ext">{t('settings.externalUrl')}</label>
              <input id="settings-ext" className="input" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="music.example.com" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={testConnection} id="settings-test-conn-btn" disabled={connStatus === 'testing'}>
              {connStatus === 'testing' ? t('settings.testingBtn') : t('settings.testBtn')}
            </button>
            {connStatus === 'ok' && <span style={{ color: 'var(--positive)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16} /> {t('settings.connected')}</span>}
            {connStatus === 'error' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><WifiOff size={16} /> {t('settings.failed')}</span>}
          </div>

          <div className="divider" style={{ margin: '1rem 0' }} />

          {/* Active connection toggle */}
          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>{t('settings.activeConn')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.activeServer')} <strong>{auth.activeConnection === 'local' ? t('settings.connLocal') : t('settings.connExternal')}</strong></div>
            </div>
            <div className="conn-toggle" role="group" aria-label="Verbindung umschalten">
              <button
                className={`conn-toggle-btn ${auth.activeConnection === 'local' ? 'active' : ''}`}
                onClick={() => auth.toggleConnection()}
                id="conn-local-btn"
                aria-pressed={auth.activeConnection === 'local'}
              >
                <Server size={13} /> {t('settings.connLocal')}
              </button>
              <button
                className={`conn-toggle-btn ${auth.activeConnection === 'external' ? 'active' : ''}`}
                onClick={() => auth.toggleConnection()}
                id="conn-extern-btn"
                aria-pressed={auth.activeConnection === 'external'}
              >
                <Globe size={13} /> {t('settings.connExternal')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Last.fm */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Music2 size={18} />
          <h2>{t('settings.lfmTitle')}</h2>
        </div>
        <div className="settings-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            <p style={{ marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: t('settings.lfmDesc1') }} />
            <p>{t('settings.lfmDesc2')}</p>
          </div>

          <div className="settings-toggle-row" style={{ marginTop: '1rem' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{t('settings.scrobbleEnabled')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.scrobbleDesc')}</div>
            </div>
            <label className="toggle-switch" aria-label="Scrobbling aktivieren">
              <input type="checkbox" checked={auth.scrobblingEnabled} onChange={e => auth.setScrobblingEnabled(e.target.checked)} id="scrobbling-toggle" />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
      </section>

      {/* App Behavior */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Sliders size={18} />
          <h2>{t('settings.behavior')}</h2>
        </div>
        <div className="settings-card">
          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>{t('settings.trayTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.trayDesc')}</div>
            </div>
            <label className="toggle-switch" aria-label="In Tray minimieren">
              <input type="checkbox" checked={auth.minimizeToTray} onChange={e => auth.setMinimizeToTray(e.target.checked)} id="tray-toggle" />
              <span className="toggle-track" />
            </label>
          </div>

          <div className="divider" />

          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>{t('settings.cacheTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('settings.cacheDesc')} ({auth.maxCacheMb} MB)</div>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={auth.maxCacheMb}
              onChange={e => auth.setMaxCacheMb(Number(e.target.value))}
              style={{ width: 120 }}
              id="cache-size-slider"
            />
          </div>
          <div className="divider" />

          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>{t('settings.downloadsTitle')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>
                {auth.downloadFolder || t('settings.downloadsDefault')}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={pickDownloadFolder} id="settings-download-folder-btn" style={{ flexShrink: 0 }}>
              <FolderOpen size={16} /> {t('settings.pickFolder')}
            </button>
          </div>
        </div>
      </section>

      {/* Logout */}
      <section className="settings-section">
        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleLogout} id="settings-logout-btn">
          <LogOut size={16} /> {t('settings.logout')}
        </button>
      </section>
    </div>
  );
}
