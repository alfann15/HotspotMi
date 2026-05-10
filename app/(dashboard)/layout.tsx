'use client';

import { useState, createContext, useContext } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastProvider from '@/components/ui/ToastProvider';

interface LayoutContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextType>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
});

export function useLayout() {
  return useContext(LayoutContext);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  return (
    <LayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />

          <Header
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
          />

          <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {children}
          </main>

          {/* Mobile overlay */}
          {mobileSidebarOpen && (
            <div
              className="sidebar-mobile-overlay"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
        </div>

        <style jsx>{`
          .sidebar-mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 45;
            backdrop-filter: blur(2px);
          }
        `}</style>
      </ToastProvider>
    </LayoutContext.Provider>
  );
}
