import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = ({ className, variant = 'default', size = 'md', dot, children, ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-panel-secondary text-muted-text',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
    info: 'bg-primary-accent/20 text-primary-accent',
    neutral: 'bg-panel-secondary text-muted-text',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', variants[variant].replace('bg-', 'bg-').replace('/20', ''))} />}
      {children}
    </span>
  );
};

export const StatusBadge = ({ status, dot = true }: { status: string; dot?: boolean }) => {
  const statusLower = status.toLowerCase();
  let variant: BadgeProps['variant'] = 'neutral';

  if (statusLower === 'pass' || statusLower === 'success' || statusLower === 'clean' || statusLower === 'match' || statusLower === 'live') {
    variant = 'success';
  } else if (statusLower === 'warning' || statusLower === 'warning' || statusLower === 'suspicious' || statusLower === 'review') {
    variant = 'warning';
  } else if (statusLower === 'fail' || statusLower === 'error' || statusLower === 'tampered' || statusLower === 'mismatch' || statusLower === 'spoof') {
    variant = 'danger';
  } else if (statusLower === 'pending' || statusLower === 'not_checked' || statusLower === 'unknown' || statusLower === 'backend_required') {
    variant = 'info';
  }

  return <Badge variant={variant} dot={dot}>{status}</Badge>;
};
