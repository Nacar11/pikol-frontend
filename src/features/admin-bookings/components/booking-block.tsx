import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatTimeRange } from '@/lib/manila';
import { BLOCK_LABELS, type Block, type BlockKind } from '../schedule-model';
import type { AdminBooking } from '../schemas';

/** One visual per state, all black and white (spec: never colour alone).
 * Exported for the legend, so the two can never disagree. */
export const BLOCK_STYLES: Record<BlockKind, string> = {
  CONFIRMED: 'border-2 border-primary bg-surface text-foreground',
  AWAITING_PAYMENT: 'border-2 border-dashed border-muted-foreground bg-surface text-foreground',
  IN_PROGRESS: 'border-2 border-primary bg-primary text-primary-foreground',
  COMPLETED: 'border border-border bg-muted text-muted-foreground',
  NO_SHOW: 'border border-border bg-muted text-muted-foreground',
  CLOSED: 'border border-border bg-hatch text-muted-foreground',
};

export function who(b: AdminBooking): string {
  if (b.type === 'MAINTENANCE') return 'Closure';
  if (b.type === 'WALK_IN') return 'Walk-in';
  return b.player ? `${b.player.first_name} ${b.player.last_name}` : 'Player';
}

/** A booking on the grid: one block across its hours, linking to its detail.
 * The label is always present, so status never rests on shade alone. */
export function BookingBlock({ block, court }: { block: Block; court: string }) {
  const { booking, kind } = block;
  const range = formatTimeRange(booking.starts_at, booking.ends_at);
  const label = BLOCK_LABELS[kind];
  return (
    <Link
      href={`/staff/bookings/${booking.id}`}
      aria-label={`${court}, ${range}, ${who(booking)}, ${label.toLowerCase()}`}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded px-2.5 py-1.5 text-left transition-shadow duration-150 hover:shadow-md',
        BLOCK_STYLES[kind],
      )}
    >
      <span className="flex items-start justify-between gap-2 text-[11px] tabular-nums">
        <span>{range}</span>
        <span
          className={cn(
            'font-semibold uppercase tracking-wider',
            kind === 'NO_SHOW' && 'line-through',
          )}
        >
          {label}
        </span>
      </span>
      <span className="truncate text-sm font-semibold">{who(booking)}</span>
    </Link>
  );
}
