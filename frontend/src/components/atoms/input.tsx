import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-11 rounded-xl border border-border bg-surface px-4 text-sm text-text transition-all duration-200',
          'placeholder:text-text-muted',
          'hover:border-slate-400',
          'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
          error &&
            'border-danger hover:border-danger focus:border-danger focus:ring-danger/10',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export { Input };
export type { InputProps };
