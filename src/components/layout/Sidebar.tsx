import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  Search,
  User,
  Settings,
  Shield,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
  Bell,
  Globe,
  Info,
  Circle,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../common';
import { useScreening, useDemoMode } from '../../hooks';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'New Screening', href: '/screening', icon: FilePlus },
  { name: 'Cases', href: '/cases', icon: FolderOpen },
  { name: 'Risk Cases', href: '/risk-cases', icon: AlertTriangle },
  { name: 'Document Analysis', href: '/documents', icon: Search },
  { name: 'Face Verification', href: '/face', icon: User },
  { name: 'Reports', href: '/reports', icon: History },
  { name: 'Audit Log', href: '/audit', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { activeScenario } = useDemoMode();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full bg-panel border-r border-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2" aria-label="IDShield AI Home">
            <Shield className="h-7 w-7 text-primary-accent" />
            <div className="flex flex-col">
              <span className="font-semibold text-text">IDShield AI</span>
              <span className="text-xs text-muted-text">Identity & Document Intelligence</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 relative" role="navigation" aria-label="Main">
        {!collapsed && (
          <motion.div
            layoutId="active-sidebar-indicator"
            className="absolute left-0 top-0 w-full h-10 bg-primary-accent/20 rounded-lg pointer-events-none transition-all duration-300"
            style={{ opacity: 1 }}
            initial={false}
          />
        )}
        <ul className="space-y-1 relative z-10" role="list">
          {navigation.map(item => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative',
                    isActive && !collapsed
                      ? 'text-primary-accent'
                      : 'text-muted-text hover:text-text hover:bg-panel-secondary',
                    collapsed && 'justify-center'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="px-3 text-xs font-semibold text-muted-text uppercase tracking-wider mb-3">System</h3>
            <ul className="space-y-1" role="list">
              <li>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-text hover:text-text hover:bg-panel-secondary transition-all duration-200"
                >
                  <Globe className="h-5 w-5" aria-hidden="true" />
                  <span className="font-medium">API Configuration</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-text hover:text-text hover:bg-panel-secondary transition-all duration-200"
                >
                  <Info className="h-5 w-5" aria-hidden="true" />
                  <span className="font-medium">About</span>
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-border absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-text mb-2">
              <Circle className="h-2 w-2 text-success" aria-hidden="true" />
              <span>Demo services simulated</span>
            </div>
            <div className="px-2 py-1 bg-danger/20 text-danger text-xs font-medium rounded">
              Demo Environment
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
