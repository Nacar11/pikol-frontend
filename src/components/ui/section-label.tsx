import { cn } from '@/lib/cn';

export function SectionLabel({
  n,
  id,
  as: Title = 'span',
  aside,
  className,
  children,
}: {
  n?: number;
  id?: string;
  as?: 'span' | 'h2' | 'h3';
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('flex items-baseline justify-between gap-2', className)}>
      <Title id={id} className="flex items-baseline gap-2">
        {n !== undefined && (
          <span aria-hidden className="text-sm font-semibold tabular-nums">
            {String(n).padStart(2, '0')}
          </span>
        )}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {children}
        </span>
      </Title>
      {aside !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">{aside}</span>
      )}
    </span>
  );
}
