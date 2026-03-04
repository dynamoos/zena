import { cn } from '@/lib/cn';

const BADGE_VARIANT = {
  DEFAULT: 'default',
  PRIMARY: 'primary',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
} as const;

type BadgeVariant = (typeof BADGE_VARIANT)[keyof typeof BADGE_VARIANT];

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-secondary text-text-secondary',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
};

function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Badge, BADGE_VARIANT };
export type { BadgeProps, BadgeVariant };
