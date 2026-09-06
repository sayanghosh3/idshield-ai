import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

interface StaggerContainerProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate'> {
  staggerChildren?: number;
  delayChildren?: number;
  className?: string;
  children: React.ReactNode;
}

export function StaggerContainer({
  staggerChildren = 0.08,
  delayChildren = 0.1,
  className,
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}