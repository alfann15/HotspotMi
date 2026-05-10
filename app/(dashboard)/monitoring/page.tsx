'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface ResourceData {
  cpuLoad: number;
  totalMemory: number;
  freeMemory: number;
  totalHddSpace: number;
  freeHddSpace: number;
  uptime: string;
  boardName: string;
  version: string;
}

interface HistoryPoint {
  time: string;
  cpu: number;
  mem: number;
}

function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export default function MonitoringPage() {
  const { data: resource } = useSWR<ResourceData>('/api/system/resource', fetcher, {
    refreshInterval: 5000,
  });

  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    if (!resource) return;
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const memUsed = resource.totalMemory - resource.freeMemory;
    const memPercent = Math.round((memUsed / resource.totalMemory) * 100);
    setHistory(prev => {
      const next = [...prev, { time, cpu: resource.cpuLoad, mem: memPercent }];
      return next.slice(-60); // simpan 60 titik terakhir (~5 menit)
    });
  }, [resource]);

  const memUsed = resource ? resource.totalMemory - resource.freeMemory : 0;
  const memPercent = resource ? Math.round((memUsed / resource.totalMemory) * 100) : 0;
  const hddUsed = resource ? resource.totalHddSpace - resource.freeHddSpace : 0;
  const hddPercent = resource ? Math.round((hddUsed / resource.totalHddSpace) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Monitoring</h1>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
          Real-time resource monitoring · Refresh setiap 5 detik
        </p>
      </div>

      {/* Gauge cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <GaugeCard
          title="CPU Load"
          value={resource?.cpuLoad ?? 0}
          unit="%"
          color={
            (resource?.cpuLoad ?? 0) > 80 ? 'hsl(0 84% 60%)' :
            (resource?.cpuLoad ?? 0) > 60 ? 'hsl(38 92% 50%)' :
            'hsl(142 71% 45%)'
          }
          subtitle={`${resource?.boardName || '—'}`}
        />
        <GaugeCard
          title="Memory"
          value={memPercent}
          unit="%"
          color={
            memPercent > 90 ? 'hsl(0 84% 60%)' :
            memPercent > 70 ? 'hsl(38 92% 50%)' :
            'hsl(217 91% 60%)'
          }
          subtitle={`${formatBytes(memUsed)} / ${formatBytes(resource?.totalMemory ?? 0)}`}
        />
        <GaugeCard
          title="Storage"
          value={hddPercent}
          unit="%"
          color={
            hddPercent > 90 ? 'hsl(0 84% 60%)' :
            hddPercent > 70 ? 'hsl(38 92% 50%)' :
            'hsl(263 70% 58%)'
          }
          subtitle={`${formatBytes(hddUsed)} / ${formatBytes(resource?.totalHddSpace ?? 0)}`}
        />
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'hsl(142 71% 45% / 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="hsl(142 71% 45%)" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" stroke="hsl(142 71% 45%)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.1rem' }}>{resource?.uptime || '—'}</div>
          <div className="stat-card-label">Uptime Router</div>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
            RouterOS v{resource?.version || '—'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>CPU & Memory History</h3>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              {history.length} titik data terkumpul
            </span>
          </div>
          <div className="card-body">
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
                    formatter={(val, name) => [`${val ?? 0}%`, name === 'cpu' ? 'CPU' : 'Memory']}
                  />
                  <Legend formatter={v => v === 'cpu' ? 'CPU %' : 'Memory %'} />
                  <Area type="monotone" dataKey="cpu" stroke="hsl(217 91% 60%)" strokeWidth={2} fill="url(#gradCpu)" dot={false} />
                  <Area type="monotone" dataKey="mem" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#gradMem)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', flexDirection: 'column', gap: '0.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '0.875rem' }}>Mengumpulkan data monitoring...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GaugeCard({ title, value, unit, color, subtitle }: {
  title: string; value: number; unit: string; color: string; subtitle: string;
}) {
  const angle = -135 + (value / 100) * 270;
  const r = 42;
  const cx = 60;
  const cy = 60;
  const startAngle = -225;
  const endAngle = startAngle + (value / 100) * 270;
  
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (from: number, to: number, radius: number) => {
    const sx = cx + radius * Math.cos(toRad(from));
    const sy = cy + radius * Math.sin(toRad(from));
    const ex = cx + radius * Math.cos(toRad(to));
    const ey = cy + radius * Math.sin(toRad(to));
    const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
  };

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <svg width="120" height="80" viewBox="0 0 120 80">
          {/* Background arc */}
          <path d={arcPath(-225, 45, r)} fill="none" stroke="hsl(var(--bg-base))" strokeWidth="10" strokeLinecap="round" />
          {/* Value arc */}
          {value > 0 && (
            <path d={arcPath(-225, endAngle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
          )}
          {/* Center text */}
          <text x={cx} y={cy - 2} textAnchor="middle"
            style={{ fill: 'hsl(var(--text-primary))', fontSize: 18, fontWeight: 700 }}>
            {value}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle"
            style={{ fill: 'hsl(var(--text-muted))', fontSize: 11 }}>
            {unit}
          </text>
        </svg>
      </div>
      <div className="stat-card-label" style={{ marginBottom: '0.25rem' }}>{title}</div>
      <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', margin: 0 }}>{subtitle}</p>
    </div>
  );
}
