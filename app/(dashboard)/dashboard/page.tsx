'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SystemResource {
  boardName: string;
  platform: string;
  version: string;
  uptime: string;
  cpuLoad: number;
  totalMemory: number;
  freeMemory: number;
  totalHddSpace: number;
  freeHddSpace: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: '1rem' }} />
      <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ width: '80%', height: 16 }} />
    </div>
  );
}

export default function DashboardPage() {
  const { data: resource, isLoading } = useSWR<SystemResource>(
    '/api/system/resource',
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: usersData } = useSWR(
    '/api/hotspot/users?pageSize=1',
    fetcher,
    { refreshInterval: 15000 }
  );

  const { data: activeData } = useSWR(
    '/api/hotspot/active',
    fetcher,
    { refreshInterval: 10000 }
  );

  // CPU History for sparkline
  const [cpuHistory, setCpuHistory] = useState<{ time: string; cpu: number }[]>([]);

  useEffect(() => {
    if (resource?.cpuLoad !== undefined) {
      const now = new Date();
      const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setCpuHistory((prev) => {
        const next = [...prev, { time, cpu: resource.cpuLoad }];
        return next.slice(-20); // Keep last 20 points
      });
    }
  }, [resource?.cpuLoad]);

  const memUsed = resource ? resource.totalMemory - resource.freeMemory : 0;
  const memPercent = resource ? Math.round((memUsed / resource.totalMemory) * 100) : 0;
  const hddUsed = resource ? resource.totalHddSpace - resource.freeHddSpace : 0;
  const hddPercent = resource ? Math.round((hddUsed / resource.totalHddSpace) * 100) : 0;

  const cpuColor = (resource?.cpuLoad || 0) > 80 ? 'red' : (resource?.cpuLoad || 0) > 60 ? 'orange' : 'green';
  const memColor = memPercent > 90 ? 'red' : memPercent > 70 ? 'orange' : 'blue';

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
          Overview sistem MikroTik dan aktivitas hotspot
        </p>
      </div>

      {/* System Stats */}
      <div className="stats-grid">
        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            {/* CPU Card */}
            <div className="stat-card">
              {(resource?.cpuLoad || 0) > 80 && (
                <div className="alert-badge">⚠ CPU Tinggi</div>
              )}
              <div className="stat-card-icon" style={{ background: `hsl(217 91% 60% / 0.12)` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="hsl(217 91% 60%)" strokeWidth="2" />
                  <rect x="9" y="9" width="6" height="6" fill="hsl(217 91% 60%)" rx="1" />
                  <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"
                    stroke="hsl(217 91% 60%)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-card-value">{resource?.cpuLoad ?? '—'}%</div>
              <div className="stat-card-label">CPU Load</div>
              <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
                <div
                  className={`progress-bar-fill ${cpuColor}`}
                  style={{ width: `${resource?.cpuLoad || 0}%` }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.375rem' }}>
                {resource?.boardName} · {resource?.platform}
              </p>
            </div>

            {/* Memory Card */}
            <div className="stat-card">
              {memPercent > 90 && (
                <div className="alert-badge" style={{ background: 'hsl(0 84% 60% / 0.12)', color: 'hsl(0 84% 60%)' }}>⚠ Memory Kritis</div>
              )}
              <div className="stat-card-icon" style={{ background: `hsl(142 71% 45% / 0.12)` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="7" width="20" height="10" rx="2" stroke="hsl(142 71% 45%)" strokeWidth="2" />
                  <path d="M6 7V5M10 7V5M14 7V5M18 7V5M6 17v2M10 17v2M14 17v2M18 17v2"
                    stroke="hsl(142 71% 45%)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-card-value">{memPercent}%</div>
              <div className="stat-card-label">Memory Usage</div>
              <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
                <div
                  className={`progress-bar-fill ${memColor}`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.375rem' }}>
                {formatBytes(memUsed)} / {formatBytes(resource?.totalMemory || 0)}
              </p>
            </div>

            {/* Uptime Card */}
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: `hsl(263 70% 58% / 0.12)` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="hsl(263 70% 58%)" strokeWidth="2" />
                  <polyline points="12 6 12 12 16 14" stroke="hsl(263 70% 58%)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
                {resource?.uptime || '—'}
              </div>
              <div className="stat-card-label">Uptime Router</div>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem' }}>
                RouterOS v{resource?.version || '—'}
              </p>
            </div>

            {/* User Count Card */}
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: `hsl(38 92% 50% / 0.12)` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="hsl(38 92% 50%)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="hsl(38 92% 50%)" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="hsl(38 92% 50%)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-card-value">{activeData?.total ?? '—'}</div>
              <div className="stat-card-label">Sesi Aktif</div>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem' }}>
                Total user: {usersData?.summary?.total ?? '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Second Row */}
      <div className="charts-grid">
        {/* CPU Sparkline */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>CPU History (5 Menit)</h3>
            <span className={`badge badge-${cpuColor}`}>{resource?.cpuLoad ?? 0}% sekarang</span>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            {cpuHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={cpuHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--bg-surface))',
                      border: '1px solid hsl(var(--border-color))',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                    }}
                    labelStyle={{ color: 'hsl(var(--text-primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2}
                    fill="url(#cpuGrad)"
                    dot={false}
                    name="CPU %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
                <span>Mengumpulkan data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Voucher Summary */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Status Voucher</h3>
          </div>
          <div className="card-body">
            {usersData?.summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <VoucherStat
                  label="Belum Dipakai"
                  value={usersData.summary.new}
                  total={usersData.summary.total}
                  color="blue"
                />
                <VoucherStat
                  label="Aktif"
                  value={usersData.summary.active}
                  total={usersData.summary.total}
                  color="green"
                />
                <VoucherStat
                  label="Expired"
                  value={usersData.summary.expired}
                  total={usersData.summary.total}
                  color="red"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
              </div>
            )}
          </div>
          <div className="card-footer">
            <a href="/vouchers" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              + Generate Voucher Baru
            </a>
          </div>
        </div>
      </div>

      {/* Active Sessions Quick Table */}
      {activeData?.sessions && activeData.sessions.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
              Sesi Aktif
            </h3>
            <span className="badge badge-green">{activeData.total} online</span>
          </div>
          <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>MAC</th>
                  <th>Uptime</th>
                  <th>Download</th>
                  <th>Upload</th>
                </tr>
              </thead>
              <tbody>
                {activeData.sessions.slice(0, 5).map((s: Record<string, string>) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.user}</td>
                    <td><code style={{ fontSize: '0.8125rem' }}>{s.address}</code></td>
                    <td><code style={{ fontSize: '0.8125rem' }}>{s.macAddress}</code></td>
                    <td>{s.uptime}</td>
                    <td>{formatBytes(parseInt(s.bytesOut || '0'))}</td>
                    <td>{formatBytes(parseInt(s.bytesIn || '0'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeData.total > 5 && (
            <div className="card-footer" style={{ textAlign: 'center' }}>
              <a href="/hotspot/active" className="btn btn-ghost btn-sm">
                Lihat semua {activeData.total} sesi →
              </a>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .charts-grid { grid-template-columns: 1fr; }
        }

        .alert-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 99px;
          background: hsl(38 92% 50% / 0.12);
          color: hsl(38 92% 40%);
        }

        .stat-card { position: relative; }
      `}</style>
    </div>
  );
}

function VoucherStat({
  label, value, total, color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'blue' | 'green' | 'red';
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge badge-${color}`}>{label}</span>
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value} <span style={{ fontWeight: 400, color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>({pct}%)</span></span>
      </div>
      <div className="progress-bar">
        <div className={`progress-bar-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
