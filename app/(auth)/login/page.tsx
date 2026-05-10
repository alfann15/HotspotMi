'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    routerIP: '',
    routerPort: '8728',
    username: 'admin',
    password: '',
    routerLabel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          routerPort: parseInt(form.routerPort) || 8728,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal. Periksa kembali data koneksi.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server. Pastikan aplikasi berjalan dengan benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-bg">
        <div className="login-bg-orb orb-1" />
        <div className="login-bg-orb orb-2" />
        <div className="login-bg-orb orb-3" />
        <div className="login-bg-grid" />
      </div>

      {/* Card */}
      <div className="login-card">
        {/* Header */}
        <div className="login-card-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="login-title">HotspotMi</h1>
              <p className="login-subtitle">MikroTik Hotspot Manager</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="login-card-body">
          <p className="login-desc">
            Masukkan detail koneksi router MikroTik Anda untuk melanjutkan.
          </p>

          <form onSubmit={handleSubmit} className="login-form" id="login-form">
            {/* Router IP */}
            <div className="form-group">
              <label className="form-label" htmlFor="routerIP">
                IP Address / Host (DNS) <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                      stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 12h20" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <input
                  id="routerIP"
                  name="routerIP"
                  type="text"
                  className="form-input with-icon"
                  placeholder="192.168.88.1 atau tunnel.net"
                  value={form.routerIP}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Port + Label */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="routerPort">Port API</label>
                <input
                  id="routerPort"
                  name="routerPort"
                  type="number"
                  className="form-input"
                  placeholder="8728"
                  value={form.routerPort}
                  onChange={handleChange}
                  min="1"
                  max="65535"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="routerLabel">Label (opsional)</label>
                <input
                  id="routerLabel"
                  name="routerLabel"
                  type="text"
                  className="form-input"
                  placeholder="Warnet Jaya"
                  value={form.routerLabel}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="form-input with-icon"
                  placeholder="admin"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input with-icon with-suffix"
                  placeholder="Kosongkan jika tidak ada password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-suffix-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Menghubungkan ke Router…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Masuk ke Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        <div className="login-card-footer">
          <p>Koneksi dienkripsi dengan JWT · Port default MikroTik API: <code>8728</code></p>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: hsl(222 47% 7%);
          position: relative;
          overflow: hidden;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .orb-1 {
          width: 500px; height: 500px;
          top: -150px; left: -100px;
          background: radial-gradient(circle, hsl(217 91% 60% / 0.6), transparent 70%);
          animation: floatOrb1 8s ease-in-out infinite;
        }

        .orb-2 {
          width: 400px; height: 400px;
          bottom: -100px; right: -80px;
          background: radial-gradient(circle, hsl(263 70% 58% / 0.5), transparent 70%);
          animation: floatOrb2 10s ease-in-out infinite;
        }

        .orb-3 {
          width: 300px; height: 300px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, hsl(142 71% 45% / 0.25), transparent 70%);
          animation: floatOrb3 12s ease-in-out infinite;
        }

        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.08); }
          66% { transform: translate(25px, -30px) scale(0.92); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.25; }
          50% { transform: translate(-50%, -55%) scale(1.1); opacity: 0.35; }
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.25rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 24px 48px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-card-header {
          padding: 2rem 2rem 1.25rem;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .login-logo-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, hsl(217 91% 60%), hsl(263 70% 58%));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px hsl(217 91% 60% / 0.4);
          flex-shrink: 0;
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          margin: 0;
          background: linear-gradient(135deg, #fff, hsl(217 91% 80%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.45);
          margin: 0;
          margin-top: 0.125rem;
        }

        .login-card-body {
          padding: 0 2rem 1.5rem;
        }

        .login-desc {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .login-form { display: flex; flex-direction: column; gap: 0; }

        /* Override form styles for dark glassmorphism */
        .login-card .form-label {
          color: rgba(255,255,255,0.75);
          font-size: 0.8125rem;
          margin-bottom: 0.375rem;
        }
        .required { color: hsl(0 84% 65%); }

        .login-card .form-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          border-radius: 0.625rem;
          padding: 0.625rem 0.875rem;
        }
        .login-card .form-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-card .form-input:focus {
          border-color: hsl(217 91% 60% / 0.6);
          background: rgba(255,255,255,0.09);
          box-shadow: 0 0 0 3px hsl(217 91% 60% / 0.15);
          outline: none;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 0.75rem;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.35);
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .form-input.with-icon { padding-left: 2.5rem; }
        .form-input.with-suffix { padding-right: 2.75rem; }

        .input-suffix-btn {
          position: absolute;
          right: 0.625rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          border-radius: 0.25rem;
          transition: color 0.15s;
        }
        .input-suffix-btn:hover { color: rgba(255,255,255,0.7); }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.625rem;
          background: hsl(0 84% 60% / 0.12);
          border: 1px solid hsl(0 84% 60% / 0.25);
          color: hsl(0 84% 72%);
          font-size: 0.8125rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .login-submit {
          width: 100%;
          padding: 0.75rem;
          font-size: 0.9375rem;
          border-radius: 0.75rem;
          gap: 0.625rem;
          margin-top: 0.5rem;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-card-footer {
          padding: 1rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center;
        }

        .login-card-footer p {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.3);
        }

        .login-card-footer code {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255,255,255,0.08);
          padding: 0.1em 0.4em;
          border-radius: 0.25rem;
          color: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
}
