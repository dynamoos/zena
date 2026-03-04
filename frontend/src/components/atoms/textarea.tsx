import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'min-h-24 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text transition-all duration-200',
          'placeholder:text-text-muted',
          'hover:border-slate-400',
          'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
          'resize-none',
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

export { Textarea };
export type { TextareaProps };
