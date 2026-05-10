'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import packageInfo from '@/package.json';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS = [
  {
    section: 'UTAMA',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        ),
      },
      {
        href: '/monitoring',
        label: 'Monitoring',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'HOTSPOT',
    items: [
      {
        href: '/hotspot/users',
        label: 'Daftar User',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: '/hotspot/active',
        label: 'Sesi Aktif',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        ),
      },
      {
        href: '/hotspot/profiles',
        label: 'Profil Paket',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 20h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'VOUCHER',
    items: [
      {
        href: '/vouchers',
        label: 'Generate Voucher',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="10" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'LAPORAN',
    items: [
      {
        href: '/reports',
        label: 'Laporan Bulanan',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'SISTEM',
    items: [
      {
        href: '/terminal',
        label: 'Terminal',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polyline points="4 17 10 11 4 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: '/settings',
        label: 'Pengaturan',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="sidebar-logo-text">HotspotMi</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            <p className="sidebar-section-label">{section.section}</p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-label={item.label}
                className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                onClick={onMobileClose}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: version */}
      <div className="sidebar-bottom">
        {!collapsed && (
          <p className="sidebar-version">v{packageInfo.version} · HotspotMi</p>
        )}
      </div>

      <style jsx>{`
        .sidebar-bottom {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .sidebar-version {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.2);
          text-align: center;
        }
      `}</style>
    </aside>
  );
}
