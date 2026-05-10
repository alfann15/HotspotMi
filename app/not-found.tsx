import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Halaman Tidak Ditemukan | HotspotMi',
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      background: 'hsl(222 47% 7%)',
      color: 'white',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        width: 72, height: 72,
        background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(263 70% 58%))',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
        boxShadow: '0 0 40px hsl(217 91% 60% / 0.4)',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, background: 'linear-gradient(135deg, hsl(217 91% 70%), hsl(263 70% 70%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.75rem 0 0.5rem', color: 'white' }}>
        Halaman Tidak Ditemukan
      </h1>
      <p style={{ color: 'hsl(215 20% 55%)', fontSize: '0.9375rem', maxWidth: 400, lineHeight: 1.6 }}>
        Halaman yang Anda cari tidak ada atau sudah dipindahkan.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/dashboard" style={{
          padding: '0.625rem 1.5rem', borderRadius: '0.625rem',
          background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(263 70% 58%))',
          color: 'white', fontWeight: 600, textDecoration: 'none',
          fontSize: '0.9rem',
        }}>
          ← Ke Dashboard
        </a>
        <a href="javascript:history.back()" style={{
          padding: '0.625rem 1.5rem', borderRadius: '0.625rem',
          border: '1px solid hsl(222 20% 25%)', color: 'hsl(215 20% 70%)',
          textDecoration: 'none', fontSize: '0.9rem',
        }}>
          Kembali
        </a>
      </div>
    </div>
  );
}
