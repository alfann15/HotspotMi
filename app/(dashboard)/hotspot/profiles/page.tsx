'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HotspotProfilesPage() {
  const { toast } = useToast();
  const { data, isLoading, mutate } = useSWR('/api/hotspot/profiles', fetcher);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rateLimit: '1M/1M',
    sharedUsers: 1,
    sessionTimeout: '',
    idleTimeout: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/hotspot/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast('Profil berhasil ditambahkan', 'success');
        setShowModal(false);
        setForm({ name: '', rateLimit: '1M/1M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '' });
        mutate();
      } else {
        toast('Gagal menambah profil', 'error');
      }
    } catch {
      toast('Error saat menambah profil', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Profil Paket</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Kelola profil bandwidth dan durasi sesi
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Tambah Profil
        </button>
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Profil</th>
                <th>Rate Limit</th>
                <th>Shared Users</th>
                <th>Session Timeout</th>
                <th>Idle Timeout</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : data?.profiles?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>
                    Belum ada profil
                  </td>
                </tr>
              ) : (
                data?.profiles?.map((p: {
                  id: string; name: string; rateLimit: string;
                  sharedUsers: string; sessionTimeout: string; idleTimeout: string;
                }) => (
                  <tr key={p.id}>
                    <td><strong style={{ fontSize: '0.875rem' }}>{p.name}</strong></td>
                    <td>
                      <code style={{ fontSize: '0.8125rem', background: 'hsl(var(--bg-base))', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                        {p.rateLimit || 'unlimited'}
                      </code>
                    </td>
                    <td>{p.sharedUsers}</td>
                    <td style={{ color: 'hsl(var(--text-secondary))' }}>{p.sessionTimeout || 'unlimited'}</td>
                    <td style={{ color: 'hsl(var(--text-secondary))' }}>{p.idleTimeout || 'unlimited'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Profile Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Tambah Profil Baru</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Profil <span className="required">*</span></label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="1h, 1d, 7d..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate Limit</label>
                  <input className="form-input" value={form.rateLimit} onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))} placeholder="1M/1M, 2M/512k..." />
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Format: upload/download. Kosongkan untuk unlimited.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shared Users</label>
                    <input type="number" className="form-input" value={form.sharedUsers} onChange={(e) => setForm((f) => ({ ...f, sharedUsers: parseInt(e.target.value) || 1 }))} min={1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Session Timeout</label>
                    <input className="form-input" value={form.sessionTimeout} onChange={(e) => setForm((f) => ({ ...f, sessionTimeout: e.target.value }))} placeholder="1h, 1d..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Idle Timeout</label>
                    <input className="form-input" value={form.idleTimeout} onChange={(e) => setForm((f) => ({ ...f, idleTimeout: e.target.value }))} placeholder="5m, 30m..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
