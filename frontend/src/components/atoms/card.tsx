import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

function Card({ className, children, hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-light bg-surface p-6 shadow-card',
        hoverable &&
          'cursor-pointer transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-5', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-text', className)} {...props}>
      {children}
    </h3>
  );
}

function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm text-text-muted', className)} {...props}>
      {children}
    </p>
  );
}

export { Card, CardHeader, CardTitle, CardDescription };
export type { CardProps };
