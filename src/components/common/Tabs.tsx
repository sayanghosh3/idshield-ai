import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: 'line' | 'enclosed' | 'soft';
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  variant?: 'line' | 'enclosed' | 'soft';
  className?: string;
}

export function Tabs({ defaultValue, value, onChange, children, variant = 'line', className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const controlled = value !== undefined;
  const currentTab = controlled ? value : activeTab;

  const handleSetActiveTab = useCallback((tab: string) => {
    if (!controlled) setActiveTab(tab);
    onChange?.(tab);
  }, [controlled, onChange]);

  return (
    <TabsContext.Provider value={{ activeTab: currentTab, setActiveTab: handleSetActiveTab, variant }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function TabsList({ children, className, 'aria-label': ariaLabel }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1',
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabTrigger({ value, children, disabled, className }: TabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabTrigger must be used within Tabs');
  const { activeTab, setActiveTab, variant } = context;

  const isActive = activeTab === value;

  const variants = {
    line: isActive
      ? 'border-b-2 border-primary-accent text-primary-accent'
      : 'text-muted-text hover:text-text hover:border-border',
    enclosed: isActive
      ? 'bg-primary-accent/20 text-primary-accent'
      : 'text-muted-text hover:text-text hover:bg-panel-secondary',
    soft: isActive
      ? 'bg-primary-accent text-background'
      : 'text-muted-text hover:text-text',
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabContent must be used within Tabs');
  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn('mt-4 animate-fade-in', className)}
    >
      {children}
    </div>
  );
}