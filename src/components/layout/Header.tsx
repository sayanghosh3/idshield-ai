import { useCases } from '../../hooks/useCases';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  AlertTriangle,
  Shield,
  ChevronDown,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../common';
import { Modal } from '../common/Modal';
import { useDemoMode } from '../../hooks/useDemoMode';

const mockNotifications = [
  { id: '1', title: 'High-risk case detected', time: '2 min ago', type: 'danger', read: false },
  { id: '2', title: 'Document analysis completed', time: '8 min ago', type: 'success', read: false },
  { id: '3', title: 'Backend unavailable - using demo mode', time: '15 min ago', type: 'warning', read: true },
  { id: '4', title: 'New screening case ID-2026-013 created', time: '1 hour ago', type: 'info', read: true },
];


export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { listItems } = useCases();
  const mockSearchResults = listItems.map(record => ({ id: record.id, type: 'Case', title: record.caseNumber, subtitle: record.subjectName + ' - ' + record.documentType, href: '/cases/' + record.id }));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { enabled, setEnabled, activeScenario, setActiveScenario, scenarios } = useDemoMode();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node) && !(e.target instanceof Element && e.target.closest('#search-results'))) {
        setShowSearchResults(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResults = searchQuery
    ? mockSearchResults.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="fixed top-0 left-16 right-0 z-30 h-16 bg-panel/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 transition-all duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} aria-label="Toggle sidebar" className="lg:hidden">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-panel-secondary rounded-lg border border-border">
          <Search className="h-4 w-4 text-muted-text" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search cases, names, passport numbers..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            className="bg-transparent border-none outline-none text-text placeholder-muted-text text-sm w-64"
            aria-label="Global search"
            aria-expanded={showSearchResults}
            aria-controls="search-results"
          />
        </div>
        {showSearchResults && searchQuery && (
          <div id="search-results" className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded-lg shadow-lg overflow-hidden" role="listbox">
            {filteredResults.length > 0 ? (
              filteredResults.map(result => (
                <Link
                  key={result.id}
                  to={result.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-panel-secondary transition-colors"
                  role="option"
                  onClick={() => { setShowSearchResults(false); setSearchQuery(''); }}
                >
                  <div className="w-2 h-2 rounded-full bg-primary-accent" />
                  <div>
                    <p className="font-medium text-text">{result.title}</p>
                    <p className="text-xs text-muted-text">{result.subtitle}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-text capitalize">{result.type}</span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-muted-text text-sm">No results found</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notificationsRef}>
          <Button variant="ghost" size="sm" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications" aria-expanded={showNotifications}>
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-panel border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text">Notifications</h3>
                <Button variant="ghost" size="sm" onClick={() => {}}>Mark all read</Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn('px-4 py-3 border-b border-border/50 hover:bg-panel-secondary/50', !notification.read && 'bg-primary-accent/5')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-2 h-2 mt-1.5 rounded-full flex-shrink-0',
                        notification.type === 'danger' && 'bg-danger',
                        notification.type === 'warning' && 'bg-warning',
                        notification.type === 'success' && 'bg-success',
                        notification.type === 'info' && 'bg-primary-accent'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.title}</p>
                        <p className="text-xs text-muted-text">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <Link to="/audit" className="text-sm text-primary-accent hover:underline block text-center">View all notifications</Link>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowDemoSelector(!showDemoSelector)} aria-label="Demo mode" aria-expanded={showDemoSelector}>
            <Shield className={cn('h-5 w-5', enabled && 'text-primary-accent')} />
          </Button>
          {showDemoSelector && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-panel border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-text">Demo Mode</h3>
                <Button variant="ghost" size="sm" onClick={() => { setEnabled(!enabled); setShowDemoSelector(false); }}>
                  {enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {scenarios.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => { setActiveScenario(scenario.id); setShowDemoSelector(false); }}
                    className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                      activeScenario === scenario.id
                        ? 'bg-primary-accent/20 text-primary-accent'
                        : 'text-muted-text hover:text-text hover:bg-panel-secondary'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-primary-accent" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{scenario.name}</p>
                      <p className="text-xs text-muted-text truncate">{scenario.description}</p>
                    </div>
                    <span className={cn('badge', scenario.riskLevel === 'high' && 'badge-danger', scenario.riskLevel === 'review' && 'badge-warning', scenario.riskLevel === 'low' && 'badge-success')}>
                      {scenario.riskScore}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => {}}>
          <Sun className="h-5 w-5" />
        </Button>

        <div className="relative" ref={userMenuRef}>
          <Button variant="ghost" size="sm" onClick={() => setShowUserMenu(!showUserMenu)} aria-label="User menu" aria-expanded={showUserMenu} className="gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-accent/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-accent" />
            </div>
            <span className="hidden sm:block font-medium text-text">Security Operator</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-panel border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="font-medium text-text">Security Operator</p>
                <p className="text-xs text-muted-text">operator@idshield.ai</p>
              </div>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-2 hover:bg-panel-secondary transition-colors" onClick={() => setShowUserMenu(false)}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
              <button className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-panel-secondary transition-colors text-danger" onClick={() => setShowUserMenu(false)}>
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
