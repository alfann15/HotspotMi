import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Masuk ke HotspotMi dashboard MikroTik Manager Anda.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {children}
    </div>
  );
}
