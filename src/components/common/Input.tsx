import { forwardRef, useId, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, hint, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input
        ref={ref}
        id={id}
        className={cn('input', error && 'border-danger focus:ring-danger', className)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger" role="alert">{error}</p>}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-muted-text">{hint}</p>}
    </div>
  );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, hint, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <textarea
        ref={ref}
        id={id}
        className={cn('input min-h-[100px] resize-y', error && 'border-danger focus:ring-danger', className)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger" role="alert">{error}</p>}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-muted-text">{hint}</p>}
    </div>
  );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, hint, options, ...props }, ref) => {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select
        ref={ref}
        id={id}
        className={cn('input', error && 'border-danger focus:ring-danger', className)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      >
        {options?.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger" role="alert">{error}</p>}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-muted-text">{hint}</p>}
    </div>
  );
  }
);

Select.displayName = 'Select';

export interface SelectOption {
  value: string;
  label: string;
}
