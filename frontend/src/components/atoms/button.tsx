import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const VARIANT = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  GHOST: 'ghost',
  OUTLINE: 'outline',
} as const;

type ButtonVariant = (typeof VARIANT)[keyof typeof VARIANT];

const SIZE = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

type ButtonSize = (typeof SIZE)[keyof typeof SIZE];

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-button hover:bg-primary-hover active:scale-[0.98]',
  secondary:
    'bg-surface-secondary text-text-secondary hover:bg-slate-200 active:scale-[0.98]',
  danger:
    'bg-danger text-white shadow-button hover:bg-danger-hover active:scale-[0.98]',
  ghost: 'text-text-secondary hover:bg-surface-secondary',
  outline:
    'border border-border bg-surface text-text-secondary shadow-button hover:bg-surface-hover',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1',
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'pointer-events-none opacity-50',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export { Button, VARIANT as BUTTON_VARIANT, SIZE as BUTTON_SIZE };
export type { ButtonProps, ButtonVariant, ButtonSize };
