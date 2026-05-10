'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
const fetcher = (url: string) => fetch(url).then(r => r.json());

import packageInfo from '@/package.json';

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSWR('/api/auth/session', fetcher);
  const { data: resource } = useSWR('/api/system/resource', fetcher);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/resource');
      if (res.ok) {
        setTestResult({ ok: true, msg: 'Koneksi ke router berhasil!' });
      } else {
        const d = await res.json();
        setTestResult({ ok: false, msg: d.message || 'Gagal terhubung ke router' });
      }
    } catch {
      setTestResult({ ok: false, msg: 'Tidak dapat menghubungi server' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const s = session?.session;
  const r = resource;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Pengaturan</h1>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
          Informasi koneksi dan konfigurasi router
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Connection Info */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              <span style={{ marginRight: '0.5rem' }}>🔌</span>Koneksi Router
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="status-dot online" />
              <span style={{ fontSize: '0.75rem', color: 'hsl(142 71% 45%)' }}>Terhubung</span>
            </div>
          </div>
          <div className="card-body">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'IP / Host', value: s?.routerIP || '—' },
                  { label: 'Port API', value: s?.routerPort || '8728' },
                  { label: 'Username', value: s?.username || '—' },
                  { label: 'Label', value: s?.routerLabel || '—' },
                ].map(({ label, value }) => (
                  <tr key={label} style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                    <td style={{ padding: '0.625rem 0', color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', width: '40%' }}>{label}</td>
                    <td style={{ padding: '0.625rem 0', fontWeight: 500, fontSize: '0.875rem' }}>
                      <code style={{ background: 'hsl(var(--bg-base))', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                        {String(value)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {testResult && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: testResult.ok ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                border: `1px solid ${testResult.ok ? 'hsl(142 71% 45% / 0.3)' : 'hsl(0 84% 60% / 0.3)'}`,
                color: testResult.ok ? 'hsl(142 71% 45%)' : 'hsl(0 84% 65%)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </div>
            )}
          </div>
          <div className="card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={testLoading}
            >
              {testLoading ? 'Testing...' : '⟳ Test Koneksi'}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleLogout}
            >
              Logout & Ganti Router
            </button>
          </div>
        </div>

        {/* Router Info */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              <span style={{ marginRight: '0.5rem' }}>📋</span>Informasi Router
            </h3>
          </div>
          <div className="card-body">
            {r ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    { label: 'Board Name', value: r.boardName },
                    { label: 'Platform', value: r.platform },
                    { label: 'RouterOS', value: `v${r.version}` },
                    { label: 'Uptime', value: r.uptime },
                    { label: 'CPU Load', value: `${r.cpuLoad}%` },
                    { label: 'CPU Count', value: r.cpuCount || '—' },
                    { label: 'CPU Freq', value: r.cpuFrequency ? `${r.cpuFrequency} MHz` : '—' },
                    { label: 'Total RAM', value: r.totalMemory ? `${(r.totalMemory / 1048576).toFixed(0)} MB` : '—' },
                  ].map(({ label, value }) => (
                    <tr key={label} style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                      <td style={{ padding: '0.5rem 0', color: 'hsl(var(--text-secondary))', fontSize: '0.8125rem', width: '45%' }}>{label}</td>
                      <td style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.8125rem' }}>{value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 28, borderRadius: 4 }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* App Info */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              <span style={{ marginRight: '0.5rem' }}>ℹ️</span>Tentang Aplikasi
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(263 70% 58%))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px hsl(217 91% 60% / 0.3)',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>HotspotMi</div>
                <div style={{ fontSize: '0.8125rem', color: 'hsl(var(--text-secondary))' }}>MikroTik Hotspot Manager v{packageInfo.version}</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Framework', value: 'Next.js 16 (Turbopack)' },
                  { label: 'Arsitektur', value: 'No-DB (RouterOS Comment)' },
                  { label: 'Auth', value: 'JWT HTTP-Only Cookie' },
                  { label: 'MikroTik API', value: 'node-routeros v1.6.8' },
                ].map(({ label, value }) => (
                  <tr key={label} style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                    <td style={{ padding: '0.5rem 0', color: 'hsl(var(--text-secondary))', fontSize: '0.8125rem', width: '45%' }}>{label}</td>
                    <td style={{ padding: '0.5rem 0', fontSize: '0.8125rem' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              <span style={{ marginRight: '0.5rem' }}>🔗</span>Navigasi Cepat
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { href: '/dashboard', label: 'Dashboard', desc: 'Overview sistem', icon: '📊' },
              { href: '/monitoring', label: 'Monitoring', desc: 'Real-time resource', icon: '📈' },
              { href: '/hotspot/users', label: 'User Hotspot', desc: 'Kelola user', icon: '👤' },
              { href: '/hotspot/active', label: 'Sesi Aktif', desc: 'Monitor online users', icon: '🟢' },
              { href: '/hotspot/profiles', label: 'Profil Paket', desc: 'Bandwidth & durasi', icon: '📦' },
              { href: '/vouchers', label: 'Voucher', desc: 'Generate & cetak', icon: '🎫' },
              { href: '/reports', label: 'Laporan', desc: 'Export data bulanan', icon: '📄' },
              { href: '/terminal', label: 'Terminal', desc: 'RouterOS CLI', icon: '🖥️' },
              { href: '/settings/setup', label: 'Setup Otomatisasi', desc: 'Install script ke RouterOS', icon: '⚙️' },
            ].map(({ href, label, desc, icon }) => (
              <a
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                  border: '1px solid hsl(var(--border-color))',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: 'transparent',
                }}
                className="settings-link"
              >
                <span style={{ fontSize: '1.125rem' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-link:hover {
          background: hsl(var(--bg-base)) !important;
          border-color: hsl(217 91% 60% / 0.4) !important;
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
