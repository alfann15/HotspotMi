'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ui/ToastProvider';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ActiveSessionsPage() {
  const { toast } = useToast();
  const { data, isLoading, mutate } = useSWR('/api/hotspot/active', fetcher, { refreshInterval: 10000 });
  const [kickingId, setKickingId] = useState<string | null>(null);

  const handleKick = async (id: string, user: string) => {
    setKickingId(id);
    const res = await fetch(`/api/hotspot/active?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast(`Sesi ${user} berhasil di-kick`, 'success');
      mutate();
    } else {
      toast('Gagal kick sesi', 'error');
    }
    setKickingId(null);
  };

  const handleKickAll = async () => {
    if (!confirm(`Kick semua ${data?.total} sesi aktif?`)) return;
    for (const s of data?.sessions || []) {
      await fetch(`/api/hotspot/active?id=${s.id}`, { method: 'DELETE' });
    }
    toast('Semua sesi berhasil di-kick', 'success');
    mutate();
  };

  function formatBytes(bytes: number) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Sesi Aktif</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Pengguna yang sedang terkoneksi ke hotspot · Auto refresh 10 detik
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => mutate()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
          {(data?.total || 0) > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleKickAll}>
              Kick Semua ({data?.total})
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span className="status-dot online" />
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
              {isLoading ? '—' : data?.total || 0} Pengguna Online
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Diperbarui setiap 10 detik
          </span>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>IP Address</th>
                <th>MAC Address</th>
                <th>Uptime</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Login Via</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data?.sessions?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="20" r="1" fill="currentColor"/>
                      </svg>
                      Tidak ada pengguna yang terkoneksi
                    </div>
                  </td>
                </tr>
              ) : (
                data?.sessions?.map((s: {
                  id: string; user: string; address: string;
                  macAddress: string; uptime: string;
                  bytesOut: string; bytesIn: string; loginBy: string;
                }) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="status-dot online" />
                        <strong style={{ fontSize: '0.875rem' }}>{s.user}</strong>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.8125rem' }}>{s.address}</code></td>
                    <td><code style={{ fontSize: '0.8125rem' }}>{s.macAddress}</code></td>
                    <td style={{ fontSize: '0.875rem' }}>{s.uptime}</td>
                    <td style={{ fontSize: '0.875rem' }}>{formatBytes(parseInt(s.bytesOut || '0'))}</td>
                    <td style={{ fontSize: '0.875rem' }}>{formatBytes(parseInt(s.bytesIn || '0'))}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{s.loginBy || 'hotspot'}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={kickingId === s.id}
                        onClick={() => handleKick(s.id, s.user)}
                      >
                        {kickingId === s.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Kick'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
