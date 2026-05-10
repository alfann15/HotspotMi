
'use client';

import React from 'react';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

interface MonthDetailVoucher {
  username: string;
  password: string;
  profile: string;
  profileLabel: string;
  prefix: string;
  status: string;
  price: number;
  createdAt: string;
}
interface PrefixStat { prefix: string; total: number; new: number; active: number; expired: number; revenue: number; }
interface ProfileStat { profile: string; total: number; new: number; active: number; expired: number; revenue: number; }
interface MonthDetail {
  year: number; month: number; monthName: string;
  summary: { total: number; new: number; active: number; expired: number; revenue: number };
  byPrefix: PrefixStat[];
  byProfile: ProfileStat[];
  vouchers: MonthDetailVoucher[];
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const COLORS = ['hsl(217 91% 60%)', 'hsl(142 71% 45%)', 'hsl(263 70% 58%)', 'hsl(38 92% 50%)'];

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

interface MonthData {
  month: number;
  monthName: string;
  total: number;
  new: number;
  active: number;
  expired: number;
  revenue: number;
  byProfile: Record<string, number>;
}

interface ReportData {
  year: number;
  yearly: { total: number; revenue: number; new: number; active: number; expired: number };
  months: MonthData[];
}

const STATUS_COLORS: Record<string, string> = { NEW: 'hsl(38 92% 50%)', ACTIVE: 'hsl(142 71% 45%)', EXPIRED: 'hsl(0 84% 60%)' };
const STATUS_LABELS: Record<string, string> = { NEW: 'Belum Dipakai', ACTIVE: 'Aktif', EXPIRED: 'Expired' };

export default function ReportsPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data, isLoading } = useSWR<ReportData>(
    `/api/reports/monthly?year=${year}`,
    fetcher
  );
  const { data: detail, isLoading: detailLoading } = useSWR<MonthDetail>(
    selectedMonth ? `/api/reports/monthly-detail?year=${year}&month=${selectedMonth}` : null,
    fetcher
  );

  const chartData = data?.months?.map(m => ({
    name: MONTH_NAMES[m.month - 1],
    voucher: m.total,
    revenue: m.revenue,
  })) ?? [];

  const handleExport = () => {
    if (!data) return;

    const rows = [
      ['Laporan Pendapatan HotspotMi'],
      ['Tahun', year],
      ['Dicetak Pada', new Date().toLocaleString('id-ID')],
      [],
      ['Bulan', 'Total Voucher', 'Belum Dipakai', 'Aktif', 'Expired', 'Pendapatan (Rp)'],
      ...(data.months || []).map(m => [
        m.monthName, m.total, m.new, m.active, m.expired, m.revenue
      ]),
      [],
      ['TOTAL', data.yearly?.total || 0, data.yearly?.new || 0, data.yearly?.active || 0, data.yearly?.expired || 0, data.yearly?.revenue || 0]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Styling kolom agar otomatis sedikit lebih lebar
    worksheet['!cols'] = [
      { wch: 15 }, // Bulan
      { wch: 15 }, // Total
      { wch: 15 }, // Belum
      { wch: 15 }, // Aktif
      { wch: 15 }, // Expired
      { wch: 20 }, // Pendapatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${year}`);

    XLSX.writeFile(workbook, `laporan-hotspotmi-${year}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();

    // Header Laporan
    doc.setFontSize(18);
    doc.text('Laporan Pendapatan HotspotMi', 14, 22);

    doc.setFontSize(11);
    doc.text(`Tahun: ${year}`, 14, 30);
    doc.text(`Dicetak Pada: ${new Date().toLocaleString('id-ID')}`, 14, 36);

    const tableBody = (data.months || []).map(m => [
      m.monthName,
      m.total.toString(),
      m.new.toString(),
      m.active.toString(),
      m.expired.toString(),
      `Rp ${m.revenue.toLocaleString('id-ID')}`
    ]);

    const tableFooter = [[
      'TOTAL',
      (data.yearly?.total || 0).toString(),
      (data.yearly?.new || 0).toString(),
      (data.yearly?.active || 0).toString(),
      (data.yearly?.expired || 0).toString(),
      `Rp ${(data.yearly?.revenue || 0).toLocaleString('id-ID')}`
    ]];

    autoTable(doc, {
      startY: 42,
      head: [['Bulan', 'Total Voucher', 'Belum Dipakai', 'Aktif', 'Expired', 'Pendapatan']],
      body: tableBody,
      foot: tableFooter,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 73, 94] }
    });

    doc.save(`laporan-hotspotmi-${year}.pdf`);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Laporan Bulanan</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Statistik penjualan voucher hotspot per bulan
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: '1px solid hsl(var(--border-color))',
              background: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-primary))',
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={!isMounted || !data || isLoading}
          >
            📊 Export Excel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
            disabled={!isMounted || !data || isLoading}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Voucher', value: data?.yearly?.total ?? 0, sub: 'Sepanjang Tahun', color: 'hsl(221 83% 53%)' },
          { label: 'Total Pendapatan', value: formatRupiah(data?.yearly?.revenue ?? 0), sub: 'Terjual (Aktif + Expired)', color: 'hsl(142 71% 45%)' },
          { label: 'Terjual', value: data ? ((data.yearly?.active || 0) + (data.yearly?.expired || 0)) : 0, sub: 'Aktif + Expired', color: 'hsl(263 70% 58%)' },
          { label: 'Belum Dipakai', value: data?.yearly?.new ?? 0, sub: 'Voucher Baru', color: 'hsl(36 100% 50%)' },
          { label: 'Expired', value: data?.yearly?.expired ?? 0, sub: 'Sudah habis masa', color: 'hsl(0 84% 60%)' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-value" style={{ color, fontSize: typeof value === 'string' && value.length > 10 ? '1rem' : undefined }}>
              {isLoading ? '—' : value}
            </div>
            <div className="stat-card-label">{label}</div>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', margin: '0.25rem 0 0' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Voucher per Bulan</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
                  formatter={(val) => [`${val} voucher`, 'Jumlah']}
                />
                <Bar dataKey="voucher" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Pendapatan per Bulan</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-color))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
                  formatter={(val) => [formatRupiah(val as number), 'Pendapatan']}
                />
                <Bar dataKey="revenue" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Detail Per Bulan</h3>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Hanya voucher yang memiliki harga terhitung di pendapatan
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid hsl(var(--border-color))' }}>
                  {['Bulan', 'Total', 'Belum Dipakai', 'Aktif', 'Expired', 'Pendapatan', 'Paket Terlaris'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} style={{ padding: '0.625rem 1rem' }}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td></tr>
                  ))
                ) : data?.months.map(m => {
                  const topProfile = Object.entries(m.byProfile).sort((a, b) => b[1] - a[1])[0];
                  const isActive = m.total > 0;
                  const isSelected = selectedMonth === m.month;
                  return (
                    <React.Fragment key={m.month}>
                      <tr
                        onClick={() => setSelectedMonth(isSelected ? null : m.month)}
                        style={{
                          borderBottom: isSelected ? 'none' : '1px solid hsl(var(--border-color))',
                          background: isSelected ? 'hsl(217 91% 60% / 0.06)' : isActive ? undefined : 'hsl(var(--bg-base) / 0.3)',
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '0.625rem 1rem', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'hsl(217 91% 60%)', transform: isSelected ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                            {m.monthName}
                          </span>
                        </td>
                        <td style={{ padding: '0.625rem 1rem' }}>
                          <span style={{ background: 'hsl(217 91% 60% / 0.1)', color: 'hsl(217 91% 60%)', padding: '0.125rem 0.5rem', borderRadius: 999, fontWeight: 600 }}>{m.total}</span>
                        </td>
                        <td style={{ padding: '0.625rem 1rem', color: 'hsl(38 92% 50%)' }}>{m.new}</td>
                        <td style={{ padding: '0.625rem 1rem', color: 'hsl(142 71% 45%)' }}>{m.active}</td>
                        <td style={{ padding: '0.625rem 1rem', color: 'hsl(0 84% 60%)' }}>{m.expired}</td>
                        <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: 'hsl(142 71% 45%)' }}>
                          {m.revenue > 0 ? formatRupiah(m.revenue) : <span style={{ color: 'hsl(var(--text-muted))' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.625rem 1rem', color: 'hsl(var(--text-secondary))' }}>
                          {topProfile ? `${topProfile[0]} (${topProfile[1]})` : '—'}
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ borderBottom: '2px solid hsl(217 91% 60% / 0.3)' }}>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div style={{ background: 'hsl(217 91% 60% / 0.04)', padding: '1rem 1.25rem' }}>
                              {detailLoading ? (
                                <div style={{ padding: '1rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>Memuat detail...</div>
                              ) : detail ? (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                  {/* Summary mini cards */}
                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {[
                                      { label: 'Total', value: detail.summary.total, color: 'hsl(217 91% 60%)' },
                                      { label: 'Belum Dipakai', value: detail.summary.new, color: 'hsl(38 92% 50%)' },
                                      { label: 'Aktif', value: detail.summary.active, color: 'hsl(142 71% 45%)' },
                                      { label: 'Expired', value: detail.summary.expired, color: 'hsl(0 84% 60%)' },
                                      { label: 'Pendapatan', value: formatRupiah(detail.summary.revenue), color: 'hsl(142 71% 45%)' },
                                    ].map(s => (
                                      <div key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-color))', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', minWidth: 100 }}>
                                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                                        <div style={{ fontWeight: 700, color: s.color, fontSize: typeof s.value === 'string' ? '0.875rem' : '1.125rem' }}>{s.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Breakdown grid */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {/* By Prefix */}
                                    <div>
                                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Per Prefix</p>
                                      {detail.byPrefix.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Tidak ada data</p> : detail.byPrefix.map(p => (
                                        <div key={p.prefix} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid hsl(var(--border-color))', fontSize: '0.8rem' }}>
                                          <span className="badge badge-gray">{p.prefix}</span>
                                          <span style={{ display: 'flex', gap: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                                            <span>{p.total} voucher</span>
                                            {p.revenue > 0 && <span style={{ color: 'hsl(142 71% 45%)', fontWeight: 600 }}>{formatRupiah(p.revenue)}</span>}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    {/* By Profile */}
                                    <div>
                                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Per Profil</p>
                                      {detail.byProfile.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Tidak ada data</p> : detail.byProfile.map(p => (
                                        <div key={p.profile} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderBottom: '1px solid hsl(var(--border-color))', fontSize: '0.8rem' }}>
                                          <span style={{ fontWeight: 600 }}>{p.profile}</span>
                                          <span style={{ display: 'flex', gap: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                                            <span>{p.total} voucher</span>
                                            {p.revenue > 0 && <span style={{ color: 'hsl(142 71% 45%)', fontWeight: 600 }}>{formatRupiah(p.revenue)}</span>}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Voucher table */}
                                  <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Daftar Voucher ({detail.vouchers.length})</p>
                                    <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid hsl(var(--border-color))', borderRadius: '0.5rem' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                        <thead>
                                          <tr style={{ background: 'hsl(var(--bg-base))' }}>
                                            {['Username', 'Profil', 'Prefix', 'Status', 'Harga', 'Dibuat'].map(h => (
                                              <th key={h} style={{ padding: '0.375rem 0.625rem', textAlign: 'left', fontWeight: 600, color: 'hsl(var(--text-secondary))', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'hsl(var(--bg-base))' }}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detail.vouchers.map((v, i) => (
                                            <tr key={i} style={{ borderTop: '1px solid hsl(var(--border-color))' }}>
                                              <td style={{ padding: '0.3rem 0.625rem' }}><code style={{ fontWeight: 600 }}>{v.username}</code></td>
                                              <td style={{ padding: '0.3rem 0.625rem' }}>{v.profile}</td>
                                              <td style={{ padding: '0.3rem 0.625rem' }}>{v.prefix ? <span className="badge badge-gray">{v.prefix}</span> : '—'}</td>
                                              <td style={{ padding: '0.3rem 0.625rem' }}><span style={{ color: STATUS_COLORS[v.status], fontWeight: 600, fontSize: '0.75rem' }}>{STATUS_LABELS[v.status] || v.status}</span></td>
                                              <td style={{ padding: '0.3rem 0.625rem', color: 'hsl(142 71% 45%)', fontWeight: 600 }}>{v.price > 0 ? formatRupiah(v.price) : '—'}</td>
                                              <td style={{ padding: '0.3rem 0.625rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>{new Date(v.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {data && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid hsl(var(--border-color))', background: 'hsl(var(--bg-base))' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>TOTAL {year}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{data.yearly.total}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'hsl(38 92% 50%)' }}>{data.yearly.new}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'hsl(142 71% 45%)' }}>{data.yearly.active}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'hsl(0 84% 60%)' }}>{data.yearly.expired}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'hsl(142 71% 45%)', fontSize: '0.9375rem' }}>
                      {formatRupiah(data.yearly.revenue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '1rem', textAlign: 'center' }}>
        💡 Pendapatan dihitung dari voucher berstatus <strong>Aktif</strong> dan <strong>Expired</strong> saja — voucher <strong>Belum Dipakai</strong> (stok) tidak dihitung.
      </p>
    </div>
  );
}
