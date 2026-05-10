'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HotspotUser {
  id: string;
  username: string;
  password: string;
  profile: string;
  metadata: { isVoucher: boolean; prefix: string; status: string; createdAt: string; profileCode: string };
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Belum Dipakai', cls: 'badge-blue' },
  ACTIVE: { label: 'Aktif', cls: 'badge-green' },
  EXPIRED: { label: 'Expired', cls: 'badge-red' },
};

export default function HotspotUsersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', prefix: '', profile: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const ssid = sessionData?.session?.routerLabel || '';

  const queryString = new URLSearchParams({
    page: String(page),
    pageSize: '50',
    ...(filters.status && { status: filters.status }),
    ...(filters.prefix && { prefix: filters.prefix }),
    ...(filters.profile && { profile: filters.profile }),
  }).toString();

  const { data, isLoading, mutate } = useSWR(
    `/api/hotspot/users?${queryString}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: profilesData } = useSWR('/api/hotspot/profiles', fetcher);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/hotspot/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('User berhasil dihapus', 'success');
      mutate();
    } else {
      toast('Gagal menghapus user', 'error');
    }
    setDeleteId(null);
  };

  const handlePrintUsers = async () => {
    setIsPrinting(true);
    try {
      const qs = new URLSearchParams({
        pageSize: '500',
        ...(filters.status && { status: filters.status }),
        ...(filters.prefix && { prefix: filters.prefix }),
        ...(filters.profile && { profile: filters.profile }),
      }).toString();

      const res = await fetch(`/api/hotspot/users?${qs}`);
      const json = await res.json();

      if (!json.users?.length) {
        toast('Tidak ada user yang cocok dengan filter untuk dicetak', 'warning');
        return;
      }

      const printData = json.users.map((u: HotspotUser) => ({
        username: u.username,
        password: u.password,
        profile: u.profile,
        profileCode: u.metadata?.profileCode || '',
        samePass: false,
      }));

      const key = `vc_print_${Date.now()}`;
      sessionStorage.setItem(key, JSON.stringify(printData));

      const subtitleParts: string[] = [];
      if (filters.prefix) subtitleParts.push(`Prefix: ${filters.prefix}`);
      if (filters.profile) subtitleParts.push(`Profil: ${filters.profile}`);
      if (filters.status) subtitleParts.push(`Status: ${filters.status}`);

      const params = new URLSearchParams({ key, layout: '3x', source: 'users' });
      if (ssid) params.set('ssid', ssid);
      if (subtitleParts.length) params.set('subtitle', subtitleParts.join(' · '));

      window.open(`/print/vouchers?${params.toString()}`, '_blank');
    } catch {
      toast('Gagal memuat data untuk dicetak', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Daftar User Hotspot</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Kelola user hotspot MikroTik Anda
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handlePrintUsers}
            disabled={isPrinting}
            title="Cetak daftar user sesuai filter aktif"
          >
            {isPrinting ? (
              <><span className="spinner-sm-dark" /> Memuat...</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="6" y="14" width="12" height="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Cetak
              </>
            )}
          </button>
          <a href="/vouchers" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Generate Voucher
          </a>
        </div>
      </div>

      {/* Summary Badges */}
      {data?.summary && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="stat-mini">
            <span className="badge badge-gray">Total</span>
            <strong>{data.summary.total}</strong>
          </div>
          <div className="stat-mini">
            <span className="badge badge-blue">Belum Dipakai</span>
            <strong>{data.summary.new}</strong>
          </div>
          <div className="stat-mini">
            <span className="badge badge-green">Aktif</span>
            <strong>{data.summary.active}</strong>
          </div>
          <div className="stat-mini">
            <span className="badge badge-red">Expired</span>
            <strong>{data.summary.expired}</strong>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
              >
                <option value="">Semua Status</option>
                <option value="NEW">Belum Dipakai</option>
                <option value="ACTIVE">Aktif</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Prefix</label>
              <input
                className="form-input"
                placeholder="WARNET, CAFE..."
                value={filters.prefix}
                onChange={(e) => { setFilters((f) => ({ ...f, prefix: e.target.value })); setPage(1); }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Profil</label>
              <select
                className="form-select"
                value={filters.profile}
                onChange={(e) => { setFilters((f) => ({ ...f, profile: e.target.value })); setPage(1); }}
              >
                <option value="">Semua Profil</option>
                {profilesData?.profiles?.map((p: { name: string }) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFilters({ status: '', prefix: '', profile: '' }); setPage(1); }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>Profil</th>
                <th>Prefix</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4, width: j === 6 ? 60 : '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Tidak ada user ditemukan
                  </td>
                </tr>
              ) : (
                data?.users?.map((user: {
                  id: string;
                  username: string;
                  password: string;
                  profile: string;
                  metadata: { isVoucher: boolean; prefix: string; status: string; createdAt: string };
                }) => (
                  <tr key={user.id}>
                    <td>
                      <code style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.username}</code>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.875rem', letterSpacing: '0.1em' }}>
                        {'•'.repeat(Math.min((user.password ?? '').length, 8)) || '—'}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem' }}>{user.profile}</span>
                    </td>
                    <td>
                      {user.metadata.isVoucher && user.metadata.prefix ? (
                        <span className="badge badge-gray">{user.metadata.prefix}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {user.metadata.isVoucher ? (
                        <span className={`badge ${STATUS_MAP[user.metadata.status]?.cls || 'badge-gray'}`}>
                          {STATUS_MAP[user.metadata.status]?.label || user.metadata.status}
                        </span>
                      ) : (
                        <span className="badge badge-gray">Manual</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'hsl(var(--text-secondary))' }}>
                      {user.metadata.createdAt
                        ? new Date(user.metadata.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Hapus user"
                          onClick={() => setDeleteId(user.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--text-muted))' }}>
              {data.pagination.total} total user · Hal {page} dari {data.pagination.totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Konfirmasi Hapus</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'hsl(var(--text-secondary))', margin: 0 }}>
                Yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .stat-mini {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: hsl(var(--bg-surface));
          border: 1px solid hsl(var(--border-color));
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .spinner-sm-dark {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.15);
          border-top-color: hsl(var(--text-secondary));
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
