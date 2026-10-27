import { cn } from '@/lib/cn';

export type Stat = { label: string; value: React.ReactNode; meter?: number };

const COLS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

/** Label/value cells across a card; `meter` (0–1) draws a bar under the value. */
export function StatStrip({ items, className }: { items: Stat[]; className?: string }) {
  return (
    <dl className={cn('grid border-y border-border', COLS[items.length], className)}>
      {items.map((s, i) => (
        <div
          key={s.label}
          className={cn('min-w-0 space-y-1 p-3 sm:p-4', i > 0 && 'border-l border-border')}
        >
          <dt className="truncate text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {s.label}
          </dt>
          <dd className="text-base font-semibold tabular-nums sm:text-lg">{s.value}</dd>
          {s.meter !== undefined && (
            <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                data-meter
                className="h-full bg-foreground"
                style={{ width: `${Math.min(100, s.meter * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </dl>
  );
}
