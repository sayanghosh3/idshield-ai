import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

interface PageTransitionProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  className?: string;
  children: React.ReactNode;
}

export function PageTransition({ className, children, ...props }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}