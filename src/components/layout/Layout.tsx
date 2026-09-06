import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTransition } from '../animations';
import { cn } from '../../utils/cn';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6 lg:p-8 pt-20 overflow-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}