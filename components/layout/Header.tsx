'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onMobileMenuClick: () => void;
}

export default function Header({ sidebarCollapsed, onToggleSidebar, onMobileMenuClick }: HeaderProps) {
  const router = useRouter();
  const [routerInfo, setRouterInfo] = useState<{
    routerIP: string;
    routerLabel?: string;
    username: string;
  } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Fetch session info
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setRouterInfo({
            routerIP: data.session.routerIP,
            routerLabel: data.session.routerLabel,
            username: data.session.username,
          });
        } else {
          // Token expired — redirect ke login
          window.location.href = '/login';
        }
      })
      .catch(() => {});

    // Check theme — apply segera untuk hindari flash
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved as 'light' | 'dark');
    document.documentElement.classList.toggle('dark', saved === 'dark');

    // Clock
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className={`app-header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Left: Toggle + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Desktop toggle */}
        <button
          id="sidebar-toggle-btn"
          className="btn btn-ghost btn-icon"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{ display: 'flex' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
        {/* Clock */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.8125rem',
          color: 'hsl(var(--text-secondary))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {currentTime}
        </div>

        {/* Router Status */}
        {routerInfo && (
          <div className={`router-status-bar ${isOnline === null ? '' : isOnline ? 'online' : 'offline'}`}>
            <span className={`status-dot ${isOnline === null ? 'unknown' : isOnline ? 'online' : 'offline'}`} />
            <span style={{ color: 'hsl(var(--text-primary))', fontSize: '0.8125rem' }}>
              {routerInfo.routerLabel || routerInfo.routerIP}
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            id="user-menu-btn"
            className="btn btn-ghost"
            onClick={() => setUserMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.625rem',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(263 70% 58%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              flexShrink: 0,
            }}>
              {routerInfo?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '600', lineHeight: '1.2' }}>
                {routerInfo?.username || 'admin'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', lineHeight: '1.2' }}>
                {routerInfo?.routerIP || '—'}
              </span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '0.25rem', opacity: 0.5 }}>
              <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {userMenuOpen && (
            <>
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 90,
              }} onClick={() => setUserMenuOpen(false)} />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border-color))',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 24px rgb(0 0 0 / 0.15)',
                minWidth: '200px',
                zIndex: 91,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid hsl(var(--border-color))' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: '600', margin: 0 }}>{routerInfo?.username}</p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: '0.125rem 0 0' }}>
                    {routerInfo?.routerIP}:{routerInfo ? '8728' : '—'}
                  </p>
                </div>
                <div style={{ padding: '0.375rem' }}>
                  <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', textDecoration: 'none', color: 'hsl(var(--text-primary))', fontSize: '0.875rem', transition: 'background 0.15s' }}
                    className="menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg>
                    Pengaturan
                  </a>
                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', color: 'hsl(0 84% 60%)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.15s' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
