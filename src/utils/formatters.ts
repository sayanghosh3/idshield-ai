export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatScore(score: number): string {
  return `${Math.round(score)} / 100`;
}

export function getRiskLevelColor(level: 'low' | 'review' | 'high'): string {
  switch (level) {
    case 'low': return 'text-success bg-success/20';
    case 'review': return 'text-warning bg-warning/20';
    case 'high': return 'text-danger bg-danger/20';
  }
}

export function getRiskLevelLabel(level: 'low' | 'review' | 'high'): string {
  switch (level) {
    case 'low': return 'LOW';
    case 'review': return 'REVIEW';
    case 'high': return 'HIGH';
  }
}

export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pass') || statusLower === 'success' || statusLower === 'clean') {
    return 'text-success bg-success/20';
  }
  if (statusLower.includes('warn') || statusLower === 'warning' || statusLower === 'suspicious') {
    return 'text-warning bg-warning/20';
  }
  if (statusLower.includes('fail') || statusLower === 'error' || statusLower === 'tampered' || statusLower === 'mismatch') {
    return 'text-danger bg-danger/20';
  }
  if (statusLower.includes('pending') || statusLower === 'not_checked' || statusLower === 'unknown') {
    return 'text-muted-text bg-panel-secondary';
  }
  return 'text-primary-accent bg-primary-accent/20';
}

export function getStatusLabel(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ID-${year}-${random}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export function getRiskColor(score: number): string {
  if (score <= 29) return '#22C55E';
  if (score <= 69) return '#F59E0B';
  return '#EF4444';
}

export function calculateRiskColor(score: number): { bg: string; text: string; border: string } {
  if (score <= 29) return { bg: 'bg-success/20', text: 'text-success', border: 'border-success/30' };
  if (score <= 69) return { bg: 'bg-warning/20', text: 'text-warning', border: 'border-warning/30' };
  return { bg: 'bg-danger/20', text: 'text-danger', border: 'border-danger/30' };
}