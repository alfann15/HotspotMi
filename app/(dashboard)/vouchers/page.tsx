'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/ui/ToastProvider';
import { PROFILE_LABELS, PROFILE_DURATIONS } from '@/lib/parser';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ServerProfile {
  id: string;
  name: string;
  dnsName: string;
}

const PROFILE_CODES = Object.keys(PROFILE_DURATIONS);

const FORMATS = [
  { value: 'alphanumeric', label: 'Alphanumeric (A-Z, 0-9)' },
  { value: 'numeric', label: 'Numerik (0-9)' },
  { value: 'alpha', label: 'Huruf (a-z)' },
];

interface GeneratedVoucher {
  username: string;
  password: string;
  comment: string;
}

export default function VouchersPage() {
  const { toast } = useToast();
  const { data: profilesData } = useSWR('/api/hotspot/profiles', fetcher);
  const { data: serverProfilesData } = useSWR('/api/hotspot/server-profiles', fetcher);
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const ssid = sessionData?.session?.routerLabel || '';

  const [mode, setMode] = useState<'bulk' | 'manual'>('bulk');

  // ── Bulk generate state ──
  const [form, setForm] = useState({
    count: 10,
    profile: '',
    serverProfile: '',
    profileCode: '1d',
    prefix: 'WARNET',
    price: 0,
    sameAsUsername: false,
    usernameLength: 8,
    passwordLength: 8,
    format: 'alphanumeric',
  });
  
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVouchers, setGeneratedVouchers] = useState<GeneratedVoucher[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    const numFields = ['count', 'price', 'usernameLength', 'passwordLength'];
    setForm((prev) => ({ ...prev, [name]: numFields.some(f => name.includes(f)) ? parseInt(value) || 0 : value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profile) {
      toast('Pilih profil paket terlebih dahulu', 'warning');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setGeneratedVouchers([]);

    try {
      const res = await fetch('/api/voucher/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.message || 'Gagal generate voucher', 'error');
        return;
      }

      setGeneratedVouchers(data.vouchers || []);
      toast(`${data.generated} voucher berhasil dibuat!`, 'success');
    } catch {
      toast('Terjadi error saat generate voucher', 'error');
    } finally {
      setGenerating(false);
      setProgress(100);
    }
  };

  const handlePrint = () => {
    const printData = generatedVouchers.map((v) => ({
      username: v.username,
      password: v.password,
      profile: form.profile,
      profileCode: form.profileCode,
      samePass: form.sameAsUsername,
    }));
    // Simpan ke sessionStorage untuk menghindari 414 URI Too Long
    const key = `vc_print_${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify(printData));
    const params = new URLSearchParams({ key, layout: '3x' });
    if (ssid) params.set('ssid', ssid);
    if (form.serverProfile) params.set('serverProfile', form.serverProfile);
    window.open(`/print/vouchers?${params.toString()}`, '_blank');
  };

  // ── Manual create state ──
  const [manualForm, setManualForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    samePass: true,
    profile: '',
    serverProfile: '',
    profileCode: '1d',
    price: 0,
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ username: string; password: string } | null>(null);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setManualForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    setManualForm(prev => ({ ...prev, [name]: name === 'price' ? parseInt(value) || 0 : value }));
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.profile) { toast('Pilih profil paket', 'warning'); return; }
    if (!manualForm.username) { toast('Username wajib diisi', 'warning'); return; }
    if (!manualForm.samePass && manualForm.password !== manualForm.confirmPassword) {
      toast('Password dan konfirmasi tidak sama', 'error'); return;
    }
    setManualLoading(true);
    try {
      const res = await fetch('/api/hotspot/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: manualForm.username,
          password: manualForm.samePass ? manualForm.username : manualForm.password,
          profile: manualForm.profile,
          profileCode: manualForm.profileCode,
          price: manualForm.price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || 'Gagal membuat user', 'error'); return;
      }
      setLastCreated({ username: data.username, password: data.password });
      toast(`User "${data.username}" berhasil dibuat!`, 'success');
      setManualForm(prev => ({ ...prev, username: '', password: '', confirmPassword: '' }));
    } catch {
      toast('Terjadi error', 'error');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div>
      {/* Header + Tab */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Voucher Hotspot</h1>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
            Generate massal atau buat user secara manual
          </p>
        </div>
        <div style={{ display: 'flex', background: 'hsl(var(--bg-base))', padding: '3px', borderRadius: '0.625rem', border: '1px solid hsl(var(--border-color))' }}>
          {([['bulk','📋 Generate Massal'],['manual','✍️ Buat Manual']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m ? 'hsl(217 91% 60%)' : 'transparent',
              color: mode === m ? 'white' : 'hsl(var(--text-secondary))',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── MANUAL MODE ── */}
      {mode === 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Buat User Custom</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleManualCreate}>
                <div className="form-group">
                  <label className="form-label">Username <span className="required">*</span></label>
                  <input type="text" name="username" className="form-input"
                    value={manualForm.username} onChange={handleManualChange}
                    placeholder="misal: tamu01, pelanggan-vip" autoComplete="off" required />
                </div>

                <div className="form-group">
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 0.75rem',
                    border: `1px solid ${manualForm.samePass ? 'hsl(217 91% 60%)' : 'hsl(var(--border-color))'}`,
                    borderRadius: '0.5rem', cursor: 'pointer',
                    background: manualForm.samePass ? 'hsl(217 91% 60% / 0.07)' : 'transparent', transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" name="samePass" checked={manualForm.samePass}
                      onChange={handleManualChange} style={{ width: 16, height: 16, accentColor: 'hsl(217 91% 60%)', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: manualForm.samePass ? 'hsl(217 91% 60%)' : 'hsl(var(--text-primary))' }}>
                        Password = Username
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Login cukup pakai username</div>
                    </div>
                  </label>
                </div>

                {!manualForm.samePass && (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Password <span className="required">*</span></label>
                      <input type="password" name="password" className="form-input"
                        value={manualForm.password} onChange={handleManualChange}
                        placeholder="Password custom..." autoComplete="new-password" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Konfirmasi Password</label>
                      <input type="password" name="confirmPassword" className="form-input"
                        value={manualForm.confirmPassword} onChange={handleManualChange}
                        placeholder="Ulangi password..."
                        style={{ borderColor: manualForm.confirmPassword && manualForm.password !== manualForm.confirmPassword ? 'hsl(0 84% 60%)' : undefined }} />
                      {manualForm.confirmPassword && manualForm.password !== manualForm.confirmPassword && (
                        <p style={{ fontSize: '0.75rem', color: 'hsl(0 84% 60%)', marginTop: '0.25rem' }}>Password tidak cocok</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Profil Paket <span className="required">*</span></label>
                  <select name="profile" className="form-select" value={manualForm.profile} onChange={handleManualChange} required>
                    <option value="">-- Pilih Profil --</option>
                    {profilesData?.profiles?.map((p: { name: string }) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Server Profile
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'hsl(var(--text-muted))', marginLeft: '0.375rem' }}>(opsional)</span>
                  </label>
                  <select name="serverProfile" className="form-select" value={manualForm.serverProfile} onChange={handleManualChange}>
                    <option value="">-- Semua / Default --</option>
                    {serverProfilesData?.serverProfiles?.map((sp: ServerProfile) => (
                      <option key={sp.id} value={sp.name}>{sp.name}{sp.dnsName ? ` (${sp.dnsName})` : ''}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Server profile hotspot MikroTik</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Kode Durasi</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
                    {PROFILE_CODES.map((code) => (
                      <label key={code} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.375rem', border: `1px solid ${manualForm.profileCode === code ? 'hsl(217 91% 60%)' : 'hsl(var(--border-color))'}`,
                        borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
                        fontWeight: manualForm.profileCode === code ? 600 : 400,
                        color: manualForm.profileCode === code ? 'hsl(217 91% 60%)' : 'hsl(var(--text-secondary))',
                        background: manualForm.profileCode === code ? 'hsl(217 91% 60% / 0.08)' : 'transparent', transition: 'all 0.15s',
                      }}>
                        <input type="radio" name="profileCode" value={code}
                          checked={manualForm.profileCode === code} onChange={handleManualChange} style={{ display: 'none' }} />
                        {PROFILE_LABELS[code] || code}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Harga <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'hsl(var(--text-muted))' }}>(opsional)</span></label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', fontSize: '0.875rem', pointerEvents: 'none' }}>Rp</span>
                    <input type="number" name="price" className="form-input"
                      value={manualForm.price || ''} onChange={handleManualChange}
                      placeholder="5000" min={0} step={500} style={{ paddingLeft: '2.25rem' }} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={manualLoading} style={{ width: '100%' }}>
                  {manualLoading ? <><span className="spinner-sm" /> Membuat user...</> : '+ Buat User'}
                </button>
              </form>
            </div>
          </div>

          {/* Result */}
          <div>
            {lastCreated ? (
              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'hsl(142 71% 45%)' }}>✓ User Berhasil Dibuat</h3>
                </div>
                <div className="card-body" style={{ display: 'grid', gap: '1.25rem' }}>
                  {([['Username', lastCreated.username], ['Password', lastCreated.password]] as const).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(217 91% 60%)', flex: 1, wordBreak: 'break-all' }}>{value}</code>
                        <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(value); toast(`${label} disalin`, 'success'); }}>
                          Salin
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={() => {
                      const pd = [{
                        username: lastCreated.username, password: lastCreated.password,
                        profile: manualForm.profile, profileCode: manualForm.profileCode, samePass: manualForm.samePass,
                      }];
                      const key = `vc_print_${Date.now()}`;
                      sessionStorage.setItem(key, JSON.stringify(pd));
                      const params = new URLSearchParams({ key, layout: '2x' });
                      if (ssid) params.set('ssid', ssid);
                      if (manualForm.serverProfile) params.set('serverProfile', manualForm.serverProfile);
                      window.open(`/print/vouchers?${params.toString()}`, '_blank');
                    }}>🖨 Cetak Voucher</button>
                    <button className="btn btn-secondary" onClick={() => setLastCreated(null)}>Buat Lagi</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '320px', border: '2px dashed hsl(var(--border-color))', borderRadius: 'var(--radius)',
                color: 'hsl(var(--text-muted))', gap: '0.75rem',
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                  Isi form dan klik <strong>Buat User</strong><br/>
                  <span style={{ fontSize: '0.8125rem' }}>Kredensial akan tampil di sini</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ BULK MODE â”€â”€ */}
      {mode === 'bulk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
          <div>
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Parameter Voucher</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleGenerate}>
                  <div className="form-group">
                    <label className="form-label">Jumlah Voucher <span className="required">*</span></label>
                    <input type="number" name="count" className="form-input" value={form.count} onChange={handleChange} min={1} max={500} required />
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Max 500 voucher per generate</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profil Paket <span className="required">*</span></label>
                    <select name="profile" className="form-select" value={form.profile} onChange={handleChange} required>
                      <option value="">-- Pilih Profil --</option>
                      {profilesData?.profiles?.map((p: { name: string }) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Server Profile
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'hsl(var(--text-muted))', marginLeft: '0.375rem' }}>(opsional)</span>
                    </label>
                    <select name="serverProfile" className="form-select" value={form.serverProfile} onChange={handleChange}>
                      <option value="">-- Semua / Default --</option>
                      {serverProfilesData?.serverProfiles?.map((sp: ServerProfile) => (
                        <option key={sp.id} value={sp.name}>{sp.name}{sp.dnsName ? ` (${sp.dnsName})` : ''}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>Server profile hotspot MikroTik</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kode Durasi Paket</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {PROFILE_CODES.map((code) => (
                        <label key={code} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem',
                          border: `1px solid ${form.profileCode === code ? 'hsl(217 91% 60%)' : 'hsl(var(--border-color))'}`,
                          borderRadius: '0.375rem', cursor: 'pointer',
                          background: form.profileCode === code ? 'hsl(217 91% 60% / 0.08)' : 'transparent',
                          fontSize: '0.8125rem', fontWeight: form.profileCode === code ? 600 : 400,
                          color: form.profileCode === code ? 'hsl(217 91% 60%)' : 'hsl(var(--text-secondary))', transition: 'all 0.15s',
                        }}>
                          <input type="radio" name="profileCode" value={code} checked={form.profileCode === code} onChange={handleChange} style={{ display: 'none' }} />
                          {PROFILE_LABELS[code] || code}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Prefix Kategori</label>
                    <input type="text" name="prefix" className="form-input" value={form.prefix} onChange={handleChange} placeholder="WARNET, CAFE, GUEST..." maxLength={20} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Harga Voucher <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'hsl(var(--text-muted))' }}>(opsional)</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', fontSize: '0.875rem', pointerEvents: 'none' }}>Rp</span>
                      <input type="number" name="price" className="form-input" value={form.price || ''} onChange={handleChange} placeholder="5000" min={0} step={500} style={{ paddingLeft: '2.25rem' }} />
                    </div>
                    {form.price > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'hsl(142 71% 45%)', marginTop: '0.25rem' }}>
                        Estimasi total: Rp {(form.price * form.count).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                      border: `1px solid ${form.sameAsUsername ? 'hsl(217 91% 60%)' : 'hsl(var(--border-color))'}`,
                      borderRadius: '0.5rem', cursor: 'pointer',
                      background: form.sameAsUsername ? 'hsl(217 91% 60% / 0.07)' : 'transparent', transition: 'all 0.15s',
                    }}>
                      <input type="checkbox" name="sameAsUsername" checked={form.sameAsUsername} onChange={handleChange}
                        style={{ width: 16, height: 16, accentColor: 'hsl(217 91% 60%)', cursor: 'pointer' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.sameAsUsername ? 'hsl(217 91% 60%)' : 'hsl(var(--text-primary))' }}>
                          Password = Username (USN=PASS)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Login cukup pakai username</div>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: form.sameAsUsername ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Panjang Username</label>
                      <input type="number" name="usernameLength" className="form-input" value={form.usernameLength} onChange={handleChange} min={4} max={16} />
                    </div>
                    {!form.sameAsUsername && (
                      <div className="form-group">
                        <label className="form-label">Panjang Password</label>
                        <input type="number" name="passwordLength" className="form-input" value={form.passwordLength} onChange={handleChange} min={4} max={16} />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Format Karakter</label>
                    <select name="format" className="form-select" value={form.format} onChange={handleChange}>
                      {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  <button id="generate-voucher-btn" type="submit" className="btn btn-primary" disabled={generating} style={{ width: '100%' }}>
                    {generating ? (
                      <><span className="spinner-sm" /> Generating {form.count} voucher...</>
                    ) : (
                      <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg> Generate {form.count} Voucher</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Result */}
          <div>
            {generatedVouchers.length > 0 ? (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{generatedVouchers.length} Voucher Berhasil Dibuat</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'hsl(var(--text-muted))' }}>
                      Profil: {form.profile} Â· Durasi: {PROFILE_LABELS[form.profileCode] || form.profileCode} Â· Prefix: {form.prefix}
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Cetak Voucher
                  </button>
                </div>
                <div className="table-container" style={{ border: 'none', maxHeight: 500, overflow: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Username</th><th>Password</th><th>Durasi</th></tr>
                    </thead>
                    <tbody>
                      {generatedVouchers.map((v, i) => (
                        <tr key={v.username}>
                          <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8125rem' }}>{i + 1}</td>
                          <td><code style={{ fontWeight: 600 }}>{v.username}</code></td>
                          <td><code>{v.password}</code></td>
                          <td><span className="badge badge-blue">{PROFILE_LABELS[form.profileCode] || form.profileCode}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '300px', border: '2px dashed hsl(var(--border-color))', borderRadius: 'var(--radius)',
                color: 'hsl(var(--text-muted))', gap: '0.75rem',
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                  <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                  Voucher yang berhasil dibuat akan muncul di sini<br/>
                  <span style={{ fontSize: '0.8125rem' }}>Isi form di sebelah kiri dan klik Generate</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .spinner-sm {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
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
