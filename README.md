# 🌐 HotspotMi

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![MikroTik](https://img.shields.io/badge/MikroTik-RouterOS-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

**HotspotMi** adalah aplikasi manajemen MikroTik Hotspot berbasis web modern yang dibangun menggunakan **Next.js** dan **Tailwind CSS**. Aplikasi ini dirancang untuk menyederhanakan operasional harian dalam mengelola jaringan Wi-Fi hotspot dengan menyediakan antarmuka yang sangat intuitif dan responsif.

Baik Anda mengelola Wi-Fi kafe kecil maupun jaringan hotspot publik berskala besar, HotspotMi memudahkan manajemen pengguna, pembuatan voucher, pelaporan keuangan, dan interaksi router—semuanya dari satu *dashboard* terpusat.

---

## ✨ Fitur Utama

- 🎟️ **Manajemen Voucher Tingkat Lanjut**
  - Buat voucher hotspot secara massal atau individu dalam hitungan detik.
  - Sesuaikan tampilan voucher, lengkap dengan QR code yang bisa di-*scan* untuk login cepat.
  - Sistem kedaluwarsa otomatis yang terhubung langsung dengan profil pengguna di MikroTik.

- 📊 **Laporan & Analitik Rinci**
  - Laporan keuangan harian dan bulanan yang mendetail.
  - Pelacakan pendapatan yang akurat berdasarkan aktivasi voucher secara *real-time*.
  - Ekspor laporan dalam format PDF profesional yang tidak dapat diedit untuk keperluan manajemen.

- 🎛️ **Integrasi Langsung dengan MikroTik**
  - Terhubung mulus ke RouterOS MikroTik Anda melalui API.
  - Pantau pengguna aktif, sesi, dan penggunaan *bandwidth* secara *real-time*.
  - Terminal RouterOS berbasis browser yang aman bawaan, untuk menjalankan perintah langsung tanpa perlu Winbox.

- 🎨 **Antarmuka Modern & Responsif**
  - Dashboard yang bersih dan mudah digunakan, dibangun dengan Tailwind CSS.
  - Desain sepenuhnya responsif, memungkinkan manajemen dari desktop, tablet, maupun *smartphone*.

---

## 🛠️ Teknologi yang Digunakan

- **Framework Frontend**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Komunikasi MikroTik**: `node-routeros`
- **Visualisasi Data**: `recharts`
- **Pembuatan PDF**: `jspdf` & `jspdf-autotable`
- **QR Code**: `qrcode.react`

---

## 🚀 Panduan Memulai

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputer lokal Anda untuk tujuan pengembangan dan pengujian.

### Prasyarat

- **Node.js**: Versi 18.x atau lebih baru.
- **Router MikroTik**: Router yang dapat diakses dari jaringan atau lingkungan *hosting* Anda.
- **API RouterOS**: Pastikan layanan API aktif di router MikroTik Anda (`IP` > `Services` > aktifkan `api`).

### Instalasi

1. **Clone repository ini**
   ```bash
   git clone https://github.com/alfann15/HotspotMi.git
   cd HotspotMi
   ```

2. **Instal dependensi**
   ```bash
   npm install
   ```

3. **Pengaturan Environment**
   Salin file environment contoh dan isi dengan data Anda:
   ```bash
   cp .env.example .env.local
   ```
   *Pastikan untuk mengisi IP MikroTik, username, password, dan JWT secret dengan benar di dalam `.env.local`.*

4. **Jalankan server pengembangan**
   ```bash
   npm run dev
   ```

5. **Akses aplikasi**
   Buka [http://localhost:3000](http://localhost:3000) di browser web Anda.

---

## 🌍 Deployment (Penyebaran)

HotspotMi sangat optimal untuk di-*deploy* menggunakan layanan serverless. Cara termudah adalah menggunakan [Vercel](https://vercel.com/):

1. *Push* kode Anda ke repository Git (GitHub).
2. *Import* proyek ini ke dalam Vercel.
3. Konfigurasikan variabel environment (seperti yang ada di `.env.local`) di dashboard Vercel.
4. Klik **Deploy**!

*(Catatan: Pastikan port API router MikroTik Anda dapat diakses dari jaringan tempat aplikasi ini di-deploy).*

---

## 📄 Lisensi

**Privat / Proprietary**  
Hak cipta dilindungi. Dilarang keras menyalin, memodifikasi, atau mendistribusikan perangkat lunak ini tanpa izin.
