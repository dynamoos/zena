import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-surface-secondary/80',
        className,
      )}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
