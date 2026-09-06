import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/cn';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6 lg:p-8 pt-20 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}