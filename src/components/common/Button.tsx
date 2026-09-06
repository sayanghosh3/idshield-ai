import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../utils/cn';

type MotionButtonProps = Pick<HTMLMotionProps<'button'>, 'whileHover' | 'whileTap' | 'whileFocus' | 'whileDrag' | 'animate' | 'initial' | 'exit' | 'transition'>;

type ButtonRestProps = Omit<HTMLMotionProps<'button'>, 'ref' | 'whileHover' | 'whileTap' | 'whileFocus' | 'whileDrag' | 'animate' | 'initial' | 'exit' | 'transition' | keyof MotionButtonProps | 'children'>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, MotionButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, loading, children, whileHover, whileTap, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-primary-accent text-background hover:bg-primary-accent/90 focus:ring-primary-accent',
      secondary: 'bg-panel-secondary text-text border border-border hover:bg-panel-secondary/80 focus:ring-border',
      danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger',
      success: 'bg-success text-white hover:bg-success/90 focus:ring-success',
      warning: 'bg-warning text-white hover:bg-warning/90 focus:ring-warning',
      ghost: 'bg-transparent text-muted-text hover:text-text hover:bg-panel-secondary focus:ring-border',
      outline: 'bg-transparent border border-border text-text hover:bg-panel-secondary focus:ring-border',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      xl: 'px-8 py-4 text-lg gap-3',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        whileHover={whileHover}
        whileTap={whileTap}
        {...(props as ButtonRestProps)}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';