import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({ value, max = 100, className, showLabel = false, label, variant = 'default', size = 'md' }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variants = {
    default: 'bg-primary-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-text">{label || `${Math.round(percentage)}%`}</span>
          {showLabel && <span className="text-sm text-muted-text">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-panel-secondary rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', variants[variant])}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function CircularProgress({ value, max = 100, size = 80, strokeWidth = 6, className, showValue = true, variant = 'default' }: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const variants = {
    default: 'text-primary-accent',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-border"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn('transition-all duration-500 ease-out', variants[variant])}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-semibold text-text">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}

interface StepProgressProps {
  statuses?: import('../../types/screening').StepStatus[];
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function StepProgress({ steps, currentStep, completedSteps = [], statuses, className, orientation = 'horizontal' }: StepProgressProps) {
  const completed = (index: number) => statuses ? statuses[index] === 'completed' : completedSteps.includes(index);
  const processing = (index: number) => statuses ? statuses[index] === 'processing' : index === currentStep;
  return (
    <div className={cn('relative', className)}>
      {orientation === 'horizontal' ? (
        <div className="flex items-center">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className="flex items-center justify-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300',
                    completed(index)
                      ? 'bg-primary-accent border-primary-accent text-background'
                      : processing(index)
                      ? 'border-primary-accent text-primary-accent bg-panel'
                      : 'border-border text-muted-text bg-panel'
                  )}
                >
                  {completed(index) ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
              </div>
              <span className={cn('mt-2 text-xs text-center max-w-[80px]', index <= currentStep ? 'text-text font-medium' : 'text-muted-text')}>
                {step}{statuses ? `: ${statuses[index]}` : ''}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4 left-1/2 w-full h-0.5 -translate-x-1/2',
                    completed(index)
                      ? 'bg-primary-accent'
                      : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300 flex-shrink-0 mt-0.5',
                  completed(index)
                    ? 'bg-primary-accent border-primary-accent text-background'
                    : processing(index)
                    ? 'border-primary-accent text-primary-accent bg-panel'
                    : 'border-border text-muted-text bg-panel'
                )}
              >
                {completed(index) ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className={cn('flex-1 pt-1', index <= currentStep ? 'text-text' : 'text-muted-text')}>
                <span className="font-medium">{step}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
