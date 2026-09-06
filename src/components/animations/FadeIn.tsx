import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
  children: React.ReactNode;
}

export function FadeIn({ 
  delay = 0, 
  duration = 0.3, 
  y = 16, 
  className, 
  children, 
  ...props 
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -y }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}