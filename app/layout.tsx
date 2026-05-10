import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | HotspotMi',
    default: 'HotspotMi — MikroTik Hotspot Manager',
  },
  description:
    'Manajemen hotspot MikroTik tanpa database. Generate voucher, monitor sesi aktif, laporan bulanan — semua dalam satu dashboard.',
  keywords: ['mikrotik', 'hotspot', 'voucher', 'routeros', 'mikhmon'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
