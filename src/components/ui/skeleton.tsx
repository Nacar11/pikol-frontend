import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-72 animate-pulse rounded-lg bg-muted motion-reduce:animate-none', className)}
    />
  );
}
