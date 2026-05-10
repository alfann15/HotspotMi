'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function SetupPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ok: boolean; msg: string} | null>(null);

  const handleInstall = async () => {
    if (!confirm('Peringatan: Ini akan menambahkan script ke semua Profil Hotspot di MikroTik Anda. Lanjutkan?')) return;
    
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/system/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('Script berhasil di-install!', 'success');
        setResult({ ok: true, msg: data.message });
      } else {
        toast('Gagal meng-install script', 'error');
        setResult({ ok: false, msg: data.error || data.message });
      }
    } catch {
      toast('Terjadi kesalahan', 'error');
      setResult({ ok: false, msg: 'Tidak dapat menghubungi server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Setup Router Otomatis</h1>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
          Install script otomatisasi HotspotMi ke RouterOS Anda
        </p>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Injeksi Script Otomatisasi</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginBottom: '1rem', lineHeight: 1.5 }}>
            HotspotMi tidak membutuhkan server 24/7 untuk menangani perhitungan masa aktif voucher.
            Kami menggunakan mekanisme <strong>Scheduler per User</strong> yang di-install langsung ke dalam MikroTik Anda.
          </p>
          
          <ul style={{ fontSize: '0.875rem', color: 'hsl(var(--text-primary))', marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: 1.6 }}>
            <li>Menambahkan script <code>on-login</code> ke semua Profil Hotspot Anda.</li>
            <li>Saat user login pertama kali, status diubah dari <code>NEW</code> ke <code>ACTIVE</code>.</li>
            <li>MikroTik otomatis membuat <em>Scheduler</em> khusus untuk user tersebut sesuai durasi paket.</li>
            <li>Saat durasi habis, Scheduler akan mendisable user, mengubah status ke <code>EXPIRED</code>, memutus koneksi aktif, lalu menghapus schedulernya sendiri.</li>
          </ul>

          {result && (
            <div style={{
              padding: '0.875rem',
              borderRadius: '0.5rem',
              background: result.ok ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
              border: `1px solid ${result.ok ? 'hsl(142 71% 45% / 0.3)' : 'hsl(0 84% 60% / 0.3)'}`,
              color: result.ok ? 'hsl(142 71% 45%)' : 'hsl(0 84% 65%)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              {result.ok ? '✓' : '✗'} {result.msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleInstall}
              disabled={loading}
            >
              {loading ? 'Meng-install...' : 'Install Script ke MikroTik'}
            </button>
            <a href="/dashboard/settings" className="btn btn-secondary">
              Kembali ke Pengaturan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
