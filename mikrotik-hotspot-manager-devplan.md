# MikroTik Hotspot Manager — Development Plan
**Arsitektur No-DB · Next.js Full-Stack · Versi 1.0**

---

## Metadata Proyek

| Atribut | Detail |
|---|---|
| Nama Proyek | MikroTik Hotspot Manager (Mikhmon-Style, No-DB) |
| Teknologi Utama | Next.js 14 (App Router) · node-routeros · JWT · SWR |
| Target Platform | Self-hosted VPS / Docker / Raspberry Pi |
| Total Fase | 8 Fase |
| Estimasi Durasi | 8 Minggu (Pengembangan Aktif) |

---

## Konsep Utama: Arsitektur No-DB

Seluruh data pengguna, voucher, dan metadata disimpan langsung di dalam field `comment` pada RouterOS MikroTik — tanpa database eksternal (tanpa MySQL, PostgreSQL, dll.). Parser di sisi Next.js menginterpretasikan data ini secara real-time.

### Skema Metadata Comment

```
# Format:
vc-{prefix}-{timestamp}-{profileCode}-{status}

# Contoh:
vc-WARNET-1704067200-p1d-NEW       → belum dipakai, paket 1 hari
vc-CAFE-1704153600-p7d-ACTIVE      → sedang aktif, paket 7 hari
vc-GUEST-1703980800-p1h-EXPIRED    → sudah kadaluarsa, paket 1 jam
```

| Field | Keterangan |
|---|---|
| prefix | Kategori voucher: WARNET, CAFE, GUEST, dll. |
| timestamp | Unix epoch saat voucher dibuat |
| profileCode | Kode paket: p1h, p1d, p7d, p30d |
| status | NEW / ACTIVE / EXPIRED |

---

## Gambaran Arsitektur Sistem

| Layer | Teknologi | Fungsi |
|---|---|---|
| Frontend | Next.js 14 App Router + Tailwind CSS | UI Dashboard, Form, Tabel, Print Template |
| API Layer | Next.js API Routes (Node.js) | Proxy ke MikroTik, Validasi, Business Logic |
| Auth | JWT di HTTP-Only Cookie | Session Management, Route Protection |
| Data Source | MikroTik RouterOS via port 8728 | Single Source of Truth |
| Metadata Store | Field comment di RouterOS | Expired date, Prefix, Status flag |
| Automation | RouterOS Scripts + Scheduler | Auto-disable expired, On-login trigger |
| State Client | SWR + Polling | Data near-real-time tanpa WebSocket |

---

## Ringkasan Semua Fase

| Fase | Judul | Minggu | Tipe |
|---|---|---|---|
| F1 | Setup Infrastruktur & Autentikasi | Minggu 1 | Core |
| F2 | Arsitektur UI & Dashboard Monitoring | Minggu 2 | Core |
| F3 | Core Hotspot & Logika Metadata No-DB | Minggu 3 | Core |
| F4 | Engine Voucher & Modul Cetak | Minggu 4 | Core |
| F5 | Otomatisasi & Injeksi Script RouterOS | Minggu 5 | Core |
| F6 | Monitoring Lanjutan & Multi-Router | Minggu 6 | Tambahan |
| F7 | Laporan Bulanan & Print Center | Minggu 7 | Tambahan |
| F8 | Testing, Optimasi & Finalisasi | Minggu 8 | Final |

---

## F1 — Setup Infrastruktur & Autentikasi
**Minggu 1 · Core**

Fondasi seluruh aplikasi. Memastikan Next.js dapat berkomunikasi secara aman ke RouterOS dan sistem login berjalan dengan benar.

### 1.1 Inisialisasi Proyek

- Scaffold Next.js 14 dengan App Router via `create-next-app`
- Instalasi library inti:
  - `node-routeros` — komunikasi ke MikroTik API port 8728
  - `jsonwebtoken` — generate dan verifikasi JWT
  - `swr` atau `@tanstack/react-query` — data fetching & caching client-side
  - `zod` — validasi schema untuk form dan API input
  - `tailwindcss` + `shadcn/ui` — komponen UI siap pakai
- Konfigurasi TypeScript strict mode dan ESLint
- Setup environment variables: `MIKROTIK_HOST`, `MIKROTIK_PORT`, `JWT_SECRET`

### 1.2 Konektor API MikroTik (`lib/mikrotik.ts`)

- Connection pooling ke port 8728 dengan timeout configurable
- Auto-reconnect logic jika koneksi terputus (router restart, dll.)
- Error handling terstruktur: router offline, kredensial salah, timeout
- Fungsi wrapper: `executeCommand()`, `getList()`, `addEntry()`, `removeEntry()`
- Logging setiap request untuk audit trail

### 1.3 Sistem Login & JWT Session

- Halaman login: form input username, password, dan IP Router
- `POST /api/auth/login` — verifikasi ke MikroTik, generate JWT jika berhasil
- JWT payload: `routerIP`, `username` (encrypted), `iat`, `exp` (24 jam)
- Token disimpan di HTTP-only Secure Cookie (bukan localStorage)
- `middleware.ts` — proteksi semua route `/dashboard/*`
- `POST /api/auth/logout` — hapus cookie, invalidate session
- Refresh token otomatis jika sisa waktu kurang dari 30 menit

### File yang Dibuat di Fase Ini

| Path | Fungsi |
|---|---|
| `lib/mikrotik.ts` | Singleton konektor RouterOS |
| `lib/jwt.ts` | Utility sign, verify, decode JWT |
| `app/api/auth/login/route.ts` | Endpoint login |
| `app/api/auth/logout/route.ts` | Endpoint logout |
| `middleware.ts` | Route protection |
| `app/(auth)/login/page.tsx` | Halaman login UI |

---

## F2 — Arsitektur UI & Dashboard Monitoring
**Minggu 2 · Core**

Membangun shell visual aplikasi: layout navigasi, dan dashboard utama dengan data router real-time.

### 2.1 Layout & Komponen Shell

- Sidebar navigasi dengan collapse mode untuk layar kecil
- Header: nama router aktif, status koneksi (online/offline indicator), user badge
- Komponen `PageBreadcrumb` untuk navigasi kontekstual
- Komponen `ComponentCard` sebagai wrapper standar untuk tabel dan form
- Loading skeleton & error boundary global
- Dark/Light mode toggle

### 2.2 Dashboard Monitoring Cards

- `GET /api/system/resource` — CPU load, memory usage, uptime, board name
- `GET /api/system/health` — temperature dan voltage (jika tersedia)
- UI Cards: CPU %, Memory Bar, Uptime Counter, Active Hotspot Sessions
- SWR polling setiap 10 detik dengan stale-while-revalidate
- Grafik sparkline CPU 5 menit terakhir menggunakan Recharts
- Alert visual jika CPU > 80% atau memory > 90%

### 2.3 Widget Status Cepat

- Total user terdaftar vs total active sessions
- Bandwidth throughput upload/download saat ini via `/interface/monitor-traffic`
- Jumlah voucher belum dipakai vs sudah expired
- Countdown timer ke jadwal script ExpireWatcher berikutnya

---

## F3 — Core Hotspot & Logika Metadata No-DB
**Minggu 3 · Core**

Jantung aplikasi. Implementasi logika parsing metadata dari field comment RouterOS.

### 3.1 Parser & Serializer Metadata (`lib/parser.ts`)

- `parseComment(raw: string): VoucherMetadata` — string ke objek terstruktur
- `serializeComment(meta: VoucherMetadata): string` — objek ke string comment
- Kalkulasi otomatis tanggal expired: `timestamp_login + durasi_paket`
- Deteksi anomali: format invalid, timestamp korup, status tidak konsisten
- Unit test untuk semua edge case parsing

### 3.2 CRUD Profil Hotspot (`/ip/hotspot/user/profile`)

- Tabel daftar profil: Nama, Rate Limit, Shared Users, Session Timeout
- Form tambah profil: nama, rate-limit (up/down), shared users, idle timeout
- Edit profil via modal dialog
- Hapus profil dengan validasi: tidak bisa dihapus jika masih ada user aktif
- Duplikasi profil untuk membuat variasi paket dengan cepat

### 3.3 Daftar User & Active Sessions

- Tabel user: Username, Password (masked), Profil, Status, Tgl Dibuat, Tgl Expired
- Badge status berwarna: Belum Dipakai (biru), Aktif (hijau), Expired (merah)
- Filter: per prefix, per profil, per status, by date range
- Pagination server-side untuk handle 1000+ user
- Tabel Active Connections: IP, MAC, Uptime, Tx/Rx, tombol Kick Session
- Bulk action: kick semua session, hapus semua expired sekaligus

---

## F4 — Engine Voucher & Modul Cetak
**Minggu 4 · Core**

Fitur Mikhmon-style yang paling sering dipakai admin jaringan.

### 4.1 Voucher Generator

- Form dengan parameter lengkap:
  - Jumlah voucher (1–500)
  - Profil paket (dropdown dari MikroTik)
  - Prefix kategori (input bebas atau pilih preset)
  - Panjang karakter username dan password
  - Format: numerik / alphanumeric / custom charset
  - Tanggal mulai expired (opsional, untuk pre-set expiry)
- Generate menggunakan `crypto.getRandomValues()` — kriptografis aman
- Cek duplikasi sebelum push: username dijamin unik
- Batch insert ke MikroTik dengan rate limiting agar tidak overload router
- Progress indicator untuk batch besar (> 100 voucher)

### 4.2 Modul Cetak Print Template

- Route khusus `/print/vouchers?ids=...` tanpa Sidebar/Header/Footer navigasi
- Layout kartu voucher:
  - `2x5` — A4 portrait
  - `3x5` — A4 landscape
  - `1 kolom` — thermal 58mm dan 80mm
- Setiap kartu menampilkan: SSID, Username, Password, Profil, Durasi, QR Code
- QR Code berisi URL auto-login atau credential string via `qrcode.react`
- CSS `@media print` untuk hide elemen non-print dan set page margin
- Watermark opsional: nama/logo toko
- Preview sebelum print + tombol Print & Download PDF

### 4.3 Import Voucher (Fitur Tambahan)

- Upload file CSV/Excel berisi daftar username dan password
- Preview data sebelum import dengan validasi format
- Assign profil dan prefix secara massal ke voucher yang diimport

---

## F5 — Otomatisasi & Injeksi Script RouterOS
**Minggu 5 · Core**

> **PERHATIAN:** Fase ini memodifikasi konfigurasi RouterOS langsung via API. Selalu backup konfigurasi router sebelum menjalankan Script Injector. Test di router non-production terlebih dahulu.

### 5.1 Setup Wizard & Script Injector

- Halaman `Settings > Router Setup` dengan wizard step-by-step
- Tombol "Setup Router Otomatis" yang memicu proses injeksi script
- Pre-check: verifikasi hak akses, cek script yang sudah ada
- Dry-run mode: tampilkan preview script sebelum dieksekusi
- Log real-time proses injeksi di UI dengan status per langkah

### 5.2 Script On-Login (Per Profil)

Ditambahkan/diupdate otomatis ke semua hotspot user profile. Logika:

1. Baca `comment` user yang baru login
2. Jika `status = NEW`: update ke `ACTIVE`, set `timestamp_login`
3. Kalkulasi `expired = timestamp_login + durasi_paket`
4. Update comment dengan expired timestamp

### 5.3 Scheduler ExpireWatcher

- Scheduler `HM-ExpireWatcher` berjalan setiap 2 menit
- Logika checker:
  1. Loop semua user hotspot dengan `status = ACTIVE`
  2. Bandingkan expired timestamp di comment dengan clock RouterOS
  3. Jika expired: ubah status ke `EXPIRED`, jalankan `/ip/hotspot/user/disable`
  4. Kick active session milik user tersebut
- Tombol "Jalankan Sekarang" untuk trigger manual dari UI
- Tombol "Hapus Setup" untuk bersihkan semua script injeksi dari router

### 5.4 Script Tambahan

- **On-Logout Script** — update `last-seen` timestamp di comment saat disconnect
- **Daily Cleanup Script** — hapus otomatis voucher EXPIRED yang sudah > 30 hari
- **Bandwidth Alert Script** — notifikasi jika interface utilization > threshold yang dikonfigurasi

---

## F6 — Monitoring Lanjutan & Multi-Router
**Minggu 6 · Tambahan**

### 6.1 Dashboard Monitoring Real-Time

- Grafik bandwidth real-time per interface menggunakan Recharts
- Polling setiap 5 detik untuk data `/interface/monitor-traffic`
- Grafik historical session count (in-memory, reset saat server restart)
- Tabel top-user: siapa yang paling banyak konsumsi bandwidth saat ini
- Heatmap aktivitas user per jam dalam sehari (analisis kapasitas)

### 6.2 Manajemen Multi-Router

- Simpan multiple router profile di local storage browser (IP, port, label)
- Switcher di Header untuk pindah antar router dengan sekali klik
- Overview panel: status ringkas semua router yang tersimpan
- Sinkronisasi profil paket antar router: copy profil dari router A ke B

### 6.3 Notifikasi Telegram Bot

- Konfigurasi Bot Token dan Chat ID di halaman Settings
- Trigger notifikasi untuk:
  - Router offline terdeteksi (heartbeat check gagal)
  - CPU atau memory melampaui threshold
  - Stok voucher tersisa kurang dari jumlah minimum
  - ExpireWatcher berhasil menonaktifkan sejumlah user
- Dikirim via Telegram API dari Next.js server
- History notifikasi 7 hari terakhir tersimpan di in-memory store

### 6.4 Backup & Restore Konfigurasi

- Download file backup RouterOS (`.backup`) langsung ke browser
- Backup metadata comment dalam format JSON untuk migration/recovery
- Jadwal backup otomatis setiap malam pukul 02.00 via Next.js cron
- Restore from JSON: re-import metadata comment jika terjadi kerusakan

---

## F7 — Laporan Bulanan & Print Center
**Minggu 7 · Tambahan**

Fitur laporan terpadu yang bisa dicetak langsung dari browser atau diekspor ke berbagai format.

### 7.1 Laporan Bulanan (Monthly Report)

Halaman khusus `/reports/monthly` yang menampilkan ringkasan aktivitas satu bulan penuh.

**Konten laporan mencakup:**

- **Ringkasan Eksekutif** — total voucher terjual, total user aktif, total user expired
- **Statistik Voucher per Paket** — breakdown per profil (p1h, p1d, p7d, p30d) dengan persentase
- **Grafik Tren Aktivasi** — voucher baru diaktifkan per hari dalam sebulan (line chart)
- **Grafik Distribusi Paket** — pie chart proporsi tiap jenis paket
- **Tabel Detail Voucher** — daftar semua voucher bulan ini: username, profil, tgl buat, tgl expired, status
- **Rekapitulasi Revenue Estimate** — jika harga per paket dikonfigurasi, tampilkan estimasi pendapatan
- **Top 10 Prefix/Kategori** — prefix voucher mana yang paling banyak digunakan
- **Catatan Admin** — field teks bebas untuk catatan manual per bulan

**Filter laporan:**
- Pilih bulan dan tahun
- Filter per prefix/kategori
- Filter per router (jika multi-router aktif)

### 7.2 Print Center (Halaman Cetak Laporan)

Route khusus `/print/report?month=YYYY-MM` tanpa navigasi, dioptimalkan untuk cetak.

**Layout cetak:**

- Header: nama usaha/hotspot, periode laporan, tanggal cetak, nama operator
- Bagian 1: Kartu ringkasan (4 metrik utama dalam satu baris)
- Bagian 2: Grafik tren aktivasi (dirender sebagai SVG agar bisa dicetak)
- Bagian 3: Tabel rekapitulasi per paket
- Bagian 4: Tabel detail voucher (dengan pagination otomatis saat cetak)
- Bagian 5: Estimasi revenue dan catatan admin
- Footer: nomor halaman, tanggal cetak

**CSS Print Rules:**

```css
@media print {
  /* Sidebar, Header, tombol aksi disembunyikan */
  .no-print { display: none; }
  
  /* Paksa warna hitam-putih untuk efisiensi tinta */
  * { -webkit-print-color-adjust: exact; }
  
  /* Grafik tidak terpotong di halaman */
  .chart-container { page-break-inside: avoid; }
  
  /* Tabel otomatis lanjut ke halaman berikutnya */
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  
  /* Set margin kertas */
  @page { margin: 15mm 20mm; size: A4 portrait; }
}
```

### 7.3 Export Laporan

- **Export Excel (.xlsx)** — tabel detail voucher lengkap via `exceljs`
- **Export CSV** — format sederhana untuk diimport ke tools lain
- **Export PDF** — laporan lengkap dengan grafik via `@react-pdf/renderer` atau `html2canvas` + `jsPDF`
- **Export JSON** — raw data untuk kebutuhan integrasi sistem lain

### 7.4 Konfigurasi Laporan

Di halaman `Settings > Laporan`, admin bisa mengatur:

- Nama usaha / hotspot yang tampil di header laporan
- Harga per paket (untuk kalkulasi estimasi revenue)
- Logo usaha (upload gambar, tampil di header cetak)
- Default format export (PDF/Excel/CSV)
- Isi catatan footer laporan

### 7.5 API Routes untuk Laporan

| Endpoint | Fungsi |
|---|---|
| `GET /api/reports/monthly?month=YYYY-MM` | Ambil data agregat bulanan dari MikroTik |
| `GET /api/reports/vouchers?month=YYYY-MM` | Daftar detail voucher per bulan |
| `GET /api/reports/export?format=xlsx&month=YYYY-MM` | Download file Excel |
| `GET /api/reports/export?format=csv&month=YYYY-MM` | Download file CSV |
| `POST /api/reports/settings` | Simpan konfigurasi laporan |

### Catatan Implementasi Laporan

> Data laporan diambil **langsung dari RouterOS** setiap kali halaman dibuka — tidak ada cache permanen. Karena RouterOS menyimpan semua history user di memori selama router tidak direstart, data yang tampil di laporan adalah data sejak router terakhir di-reset. Untuk history jangka panjang (> 1 bulan), tambahkan mekanisme export/snapshot bulanan yang disimpan di file JSON di server Next.js.

---

## F8 — Testing, Optimasi & Finalisasi
**Minggu 8 · Final**

### 8.1 Stress Test & Performa API

- Benchmark ambil data 1000+ user: target response < 2 detik
- Implementasi cursor-based pagination untuk tabel besar
- Cache layer via `node-cache` untuk data jarang berubah (profil, settings)
- Rate limiting pada API Routes agar tidak overload router
- Profiling bottleneck dengan Next.js built-in instrumentation

### 8.2 Validasi Waktu & Timezone

- Pastikan timezone server Next.js = timezone clock RouterOS (WIB/WITA/WIT)
- Gunakan `date-fns-tz` atau `Luxon` untuk semua kalkulasi tanggal
- Halaman Settings: tampilkan perbandingan waktu server vs waktu router
- Alert otomatis jika selisih waktu > 60 detik
- Unit test kalkulasi expired dengan berbagai timezone edge case

### 8.3 Security Hardening

- Validasi semua input dengan Zod sebelum dikirim ke MikroTik
- Sanitasi command: cegah injection via field username atau comment
- Rate limiting pada `/api/auth/login` (max 5 percobaan per menit per IP)
- CORS policy: hanya izinkan request dari origin yang sama
- Audit log: catat semua aksi CRUD
- Enkripsi kredensial di JWT payload menggunakan AES-256 sebelum disign

### 8.4 Deployment & Dokumentasi

- `Dockerfile` untuk containerized deployment
- `docker-compose.yml` dengan environment terpisah per lingkungan
- Panduan deployment: VPS (Ubuntu), Raspberry Pi, PM2
- `README.md` komprehensif: instalasi, konfigurasi, troubleshooting
- Halaman Help di dalam aplikasi dengan panduan penggunaan per fitur

---

## Struktur Folder Proyek

```
mikrotik-manager/
├── app/
│   ├── (auth)/
│   │   └── login/                  # Halaman login
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Shell layout (Sidebar + Header)
│   │   ├── page.tsx                # Dashboard utama
│   │   ├── hotspot/                # User, profil, active sessions
│   │   ├── vouchers/               # Generator & import voucher
│   │   ├── monitoring/             # Grafik real-time, multi-router
│   │   ├── reports/                # Laporan bulanan & export
│   │   └── settings/              # Router setup, konfigurasi app
│   ├── api/
│   │   ├── auth/                   # Login, logout, session
│   │   ├── system/                 # Resource, health, clock
│   │   ├── hotspot/                # Users, profiles, active
│   │   ├── voucher/                # Generate, import
│   │   ├── reports/                # Monthly report, export
│   │   ├── scripts/                # Injector, scheduler
│   │   └── notify/                 # Telegram notification
│   └── print/
│       ├── vouchers/               # Print template voucher
│       └── report/                 # Print template laporan bulanan
├── lib/
│   ├── mikrotik.ts                 # MikroTik API connector
│   ├── jwt.ts                      # JWT sign/verify
│   ├── parser.ts                   # Comment metadata parser
│   ├── voucher.ts                  # Voucher generator logic
│   ├── reports.ts                  # Report data aggregator
│   └── timezone.ts                 # Timezone utilities
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/                     # Sidebar, Header, Breadcrumb
│   ├── dashboard/                  # Cards, Charts
│   ├── hotspot/                    # User Table, Profile Form
│   ├── voucher/                    # Generator Form, Print Card
│   └── reports/                    # Report Charts, Print Layout
├── middleware.ts                    # JWT route protection
├── .env.local                      # Environment variables
└── docker-compose.yml              # Docker deployment
```

---

## Daftar Dependensi NPM

### Dependencies Produksi

| Package | Fungsi |
|---|---|
| `next` ^14.x | Framework utama (App Router, API Routes, Middleware) |
| `node-routeros` ^1.x | MikroTik RouterOS API client |
| `jsonwebtoken` ^9.x | Generate dan verifikasi JWT |
| `swr` ^2.x | Data fetching dengan polling |
| `zod` ^3.x | Schema validation |
| `date-fns-tz` ^3.x | Kalkulasi tanggal dengan timezone (WIB/WITA) |
| `qrcode.react` ^3.x | Generate QR Code untuk voucher |
| `exceljs` ^4.x | Export laporan ke Excel (.xlsx) |
| `jspdf` + `html2canvas` | Export laporan ke PDF |
| `recharts` ^2.x | Grafik monitoring dan laporan |
| `node-cache` ^5.x | In-memory caching |
| `tailwindcss` ^3.x | Utility-first CSS framework |
| `shadcn/ui` | Komponen UI siap pakai |

### Dev Dependencies

| Package | Fungsi |
|---|---|
| `typescript` | Type safety |
| `jest` + `@testing-library/react` | Unit test dan component test |
| `prettier` + `eslint` | Code formatting dan linting |
| `husky` + `lint-staged` | Pre-commit hooks |

---

## Risiko & Strategi Mitigasi

| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Router offline saat akses UI | Tinggi | Error boundary + fallback UI + auto-retry |
| Timezone mismatch server vs router | Tinggi | Alert otomatis jika selisih > 60 detik |
| Comment field korup / format salah | Sedang | Parser dengan fallback graceful |
| Performance lambat 1000+ user | Sedang | Cursor pagination + caching |
| JWT bocor via XSS | Sedang | HTTP-only cookie + CSP headers |
| Script injeksi merusak konfigurasi | Sedang | Dry-run preview + backup sebelum injeksi |
| History laporan hilang saat router restart | Sedang | Export snapshot JSON bulanan ke server |
| Port 8728 tidak accessible | Rendah | Dokumentasi firewall rules + test di setup wizard |

---

## Langkah Pertama yang Disarankan

Mulai dari Fase 1 dan validasi koneksi ke MikroTik sebelum lanjut ke fase berikutnya. Urutan eksekusi kode yang disarankan:

1. Setup Next.js project + install dependencies
2. Buat `lib/mikrotik.ts` dan test koneksi sederhana ke RouterOS
3. Buat `lib/jwt.ts` dan sistem login
4. Setelah login berhasil → lanjut ke F2 (UI Layout)
5. Setiap fase berikutnya bergantung pada fondasi koneksi yang solid

---

*MikroTik Hotspot Manager — Development Plan v1.0*
*Format: Markdown · Untuk digunakan bersama AI Agent*
