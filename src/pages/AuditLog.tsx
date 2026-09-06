import { useState, useMemo } from 'react';
import { Search, Filter, Download, Calendar, ChevronDown, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { mockAuditEvents } from '../mocks/cases';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import { FadeIn, StaggerContainer } from '../components/animations';

export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const categories = [...new Set(mockAuditEvents.map(e => e.category))];
  const statuses = [...new Set(mockAuditEvents.map(e => e.status))];

  const filteredEvents = useMemo(() => {
    return mockAuditEvents.filter(event => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.event.toLowerCase().includes(query) &&
            !event.actor.toLowerCase().includes(query) &&
            !JSON.stringify(event.details).toLowerCase().includes(query)) {
          return false;
        }
      }
      if (categoryFilter.length > 0 && !categoryFilter.includes(event.category)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(event.status)) return false;
      return true;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success': return { icon: CheckCircle, color: 'text-success', bg: 'bg-success/20' };
      case 'warning': return { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/20' };
      case 'error': return { icon: XCircle, color: 'text-danger', bg: 'bg-danger/20' };
      default: return { icon: Clock, color: 'text-primary-accent', bg: 'bg-primary-accent/20' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Audit Log</h1>
            <p className="text-muted-text">System and user activity timeline</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="secondary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search events, actors, details..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      label="Search"
                    />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={categoryFilter.includes(cat)}
                            onChange={e => setCategoryFilter(prev => e.target.checked ? [...prev, cat] : prev.filter(v => v !== cat))}
                            className="rounded border-border text-primary-accent focus:ring-primary-accent"
                          />
                          <span className="text-sm capitalize">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map(status => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={statusFilter.includes(status)}
                            onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, status] : prev.filter(v => v !== status))}
                            className="rounded border-border text-primary-accent focus:ring-primary-accent"
                          />
                          <Badge variant={status === 'success' ? 'success' : status === 'warning' ? 'warning' : status === 'error' ? 'danger' : 'info'} size="sm">
                            {status}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card padding="none">
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, index) => {
                  const config = getStatusConfig(event.status);
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className={cn('flex items-start gap-4 p-4 hover:bg-panel-secondary/50 transition-colors cursor-pointer', selectedEvent?.id === event.id && 'bg-primary-accent/5')}
                      onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                    >
                      <div className="flex-shrink-0 w-20 text-right text-muted-text text-xs font-mono pr-4 border-r border-border/50">
                        <div>{formatDateTime(event.timestamp).split(', ')[0]}</div>
                        <div className="text-primary-accent mt-1">{formatDateTime(event.timestamp).split(', ')[1]}</div>
                      </div>
                      <motion.div
                        className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', config.bg)}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Icon className={cn('w-5 h-5', config.color)} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text">{event.event}</p>
                          <Badge variant={event.status === 'success' ? 'success' : event.status === 'warning' ? 'warning' : event.status === 'error' ? 'danger' : 'info'} size="sm">
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-text">{event.actor} ({event.actorType})</p>
                        {event.details && (
                          <p className="text-xs text-muted-text mt-1 font-mono max-w-2xl truncate">
                            {JSON.stringify(event.details)}
                          </p>
                        )}
                      </div>
                      <AnimatePresence>
                        {selectedEvent?.id === event.id && (
                          <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                          >
                            <div className="bg-panel border border-border rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-text">Event Details</h3>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <XCircle className="w-5 h-5" />
                                </Button>
                              </div>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div><span className="text-muted-text">Timestamp</span><p className="font-mono">{formatDateTime(event.timestamp)}</p></div>
                                  <div><span className="text-muted-text">Event</span><p className="font-medium">{event.event}</p></div>
                                  <div><span className="text-muted-text">Category</span><p className="capitalize">{event.category}</p></div>
                                  <div><span className="text-muted-text">Status</span><Badge variant={event.status === 'success' ? 'success' : event.status === 'warning' ? 'warning' : event.status === 'error' ? 'danger' : 'info'}>{event.status}</Badge></div>
                                  <div><span className="text-muted-text">Actor</span><p>{event.actor}</p></div>
                                  <div><span className="text-muted-text">Actor Type</span><p className="capitalize">{event.actorType}</p></div>
                                  {event.ipAddress && <div><span className="text-muted-text">IP Address</span><p className="font-mono">{event.ipAddress}</p></div>}
                                  {event.userAgent && <div><span className="text-muted-text">User Agent</span><p className="font-mono truncate">{event.userAgent}</p></div>}
                                </div>
                                {event.details && (
                                  <div>
                                    <span className="text-muted-text">Details</span>
                                    <pre className="mt-2 p-3 bg-panel-secondary rounded-lg text-xs overflow-x-auto"><code>{JSON.stringify(event.details, null, 2)}</code></pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex items-center justify-between text-sm text-muted-text">
          <span>Showing {filteredEvents.length} of {mockAuditEvents.length} events</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}