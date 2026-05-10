/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Paket-paket ini hanya berjalan di server Node.js, jangan di-bundle oleh webpack
  serverExternalPackages: [
    'node-routeros',
    'source-map-support',
  ],

  compiler: {
    styledJsx: true,
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
