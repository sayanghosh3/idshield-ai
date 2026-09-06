import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileHover'> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

export function AnimatedCard({
  hover = true,
  padding = 'md',
  className,
  children,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.2)' } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('bg-panel border border-border rounded-xl transition-all duration-200', paddingStyles[padding], className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}