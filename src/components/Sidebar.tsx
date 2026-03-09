import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Disc3, Users, Music4, Radio, Settings, Heart, BarChart3, Shuffle, ListMusic,
  PanelLeftClose, PanelLeft
} from 'lucide-react';

const PsysonicLogo = () => (
  <img src="/logo.png" alt="Psysonic Logo" width="36" height="36" style={{ borderRadius: '8px' }} />
);

const navItems = [
  { icon: Disc3, labelKey: 'sidebar.mainstage', to: '/' },
  { icon: Radio, labelKey: 'sidebar.newReleases', to: '/new-releases' },
  { icon: Music4, labelKey: 'sidebar.allAlbums', to: '/albums' },
  { icon: Users, labelKey: 'sidebar.artists', to: '/artists' },
  { icon: ListMusic, labelKey: 'sidebar.playlists', to: '/playlists' },
  { icon: Shuffle, labelKey: 'sidebar.randomMix', to: '/random-mix' },
  { icon: Heart, labelKey: 'sidebar.favorites', to: '/favorites' },
];

export default function Sidebar({ 
  isCollapsed = false, 
  toggleCollapse 
}: { 
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <aside className={`sidebar animate-slide-in ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <button 
          className="collapse-btn" 
          onClick={toggleCollapse} 
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          style={{ padding: 0 }}
        >
          {isCollapsed ? <PanelLeft size={24} /> : <PanelLeftClose size={24} />}
        </button>
        {!isCollapsed && <PsysonicLogo />}
        {!isCollapsed && <span className="brand-name">Psysonic</span>}
      </div>

      <nav className="sidebar-nav" aria-label="Hauptnavigation">
        {!isCollapsed && <span className="nav-section-label">{t('sidebar.library')}</span>}
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? t(item.labelKey) : undefined}
          >
            <item.icon size={isCollapsed ? 22 : 18} />
            {!isCollapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}

        {!isCollapsed && <span className="nav-section-label" style={{ marginTop: 'auto' }}>{t('sidebar.system')}</span>}
        <NavLink
          to="/statistics"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          style={isCollapsed ? { marginTop: 'auto' } : undefined}
          title={isCollapsed ? t('sidebar.statistics') : undefined}
        >
          <BarChart3 size={isCollapsed ? 22 : 18} />
          {!isCollapsed && <span>{t('sidebar.statistics')}</span>}
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          title={isCollapsed ? t('sidebar.settings') : undefined}
        >
          <Settings size={isCollapsed ? 22 : 18} />
          {!isCollapsed && <span>{t('sidebar.settings')}</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
