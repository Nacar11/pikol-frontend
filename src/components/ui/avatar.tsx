import { cn } from '@/lib/cn';

export function Avatar({
  first,
  last,
  className,
}: {
  first: string;
  last: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded border border-border text-xs font-semibold',
        className,
      )}
    >
      {`${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()}
    </span>
  );
}
