import { useState, useCallback } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTransition } from '../animations';
import { Modal } from '../common/Modal';
import { RouteContent } from '../common/RouteContent';
import { cn } from '../../utils/cn';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const outlet = useOutlet();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:p-3 focus:bg-panel">Skip to content</a>
      <div className="hidden lg:block"><Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} /></div>
      <Modal isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title="Navigation" size="sm"><Sidebar mobile onToggle={() => setMobileOpen(false)} /></Modal>
      <div className={cn('min-w-0 flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <Header collapsed={sidebarCollapsed} onToggleSidebar={() => setMobileOpen(true)} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-20 lg:pt-20">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <RouteContent>{outlet}</RouteContent>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
