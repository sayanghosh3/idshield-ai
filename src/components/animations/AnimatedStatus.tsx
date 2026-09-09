import { motion, HTMLMotionProps } from 'motion/react';
import type { StepStatus } from '../../types/screening';
import { normalizeStepStatus } from '../../utils/screeningStatus';
import { cn } from '../../utils/cn';

interface AnimatedStatusProps extends Omit<HTMLMotionProps<'span'>, 'initial' | 'animate'> {
  status: StepStatus;
  className?: string;
  children?: React.ReactNode;
}

const statusVariants = {
  skipped: { initial: { opacity: 1 }, animate: { opacity: 1 } },
  completed: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
  },
  processing: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  pending: {
    initial: { opacity: 0.4 },
    animate: { opacity: 0.4 },
  },
  failed: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
  },
};

const statusIcons = {
  skipped: <span className="w-4 h-4 text-center">−</span>,
  completed: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  ),
  processing: (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  pending: (
    <span className="w-4 h-4 text-center font-bold text-[10px]">•</span>
  ),
  failed: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const statusColors = {
  skipped: 'text-muted-text',
  completed: 'text-success',
  processing: 'text-primary-accent',
  pending: 'text-muted-text',
  failed: 'text-danger',
};

export function AnimatedStatus({
  status,
  className,
  children,
  ...props
}: AnimatedStatusProps) {
  const safeStatus = normalizeStepStatus(status);
  const variant = statusVariants[safeStatus];
  const Icon = statusIcons[safeStatus];
  const colorClass = statusColors[safeStatus];

  return (
    <motion.span
      aria-label={safeStatus}
      initial={variant.initial}
      animate={variant.animate}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('inline-flex items-center gap-1.5', colorClass, className)}
      {...props}
    >
      {Icon}
      {children}
    </motion.span>
  );
}
