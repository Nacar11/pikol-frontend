'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { useAvailability } from '@/features/availability';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { formatDayChip, formatHour } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { REFETCH_MS, useDayBookings } from '../hooks/use-day-bookings';
import { useNow } from '../hooks/use-now';
import { BLOCK_LABELS, blockKind, blocksFor, dayKpis, liveStatus } from '../schedule-model';
import type { AdminBooking } from '../schemas';
import { who } from './booking-block';

/**
 * "Day at a glance": four KPI tiles and the day's bookings in time order.
 * Reads the same cached queries as the grid, so the two always agree.
 */
export function DayGlance({ venueId, date }: { venueId: number; date: string }) {
  const grid = useAvailability(venueId, date, { refetchInterval: REFETCH_MS });
  const bookings = useDayBookings(venueId, date);
  const now = useNow();
  const { weekday, date: short } = formatDayChip(date);

  const all = bookings.data?.data ?? [];
  // Every booking feeds the tiles — a closure shrinks what is bookable — but
  // the list is sessions only; closures are on the grid.
  const kpis = grid.data ? dayKpis(grid.data, blocksFor(grid.data, all, now)) : null;
  const rows = all
    .filter((b) => b.type !== 'MAINTENANCE')
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  return (
    <aside aria-label="Day at a glance" className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Day at a glance
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          {weekday} {short}
        </h2>
      </div>

      {kpis ? (
        <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-surface">
          <Tile
            label="Booked"
            value={`${kpis.bookedHours} h`}
            note={`of ${kpis.bookableHours} h bookable`}
          />
          <Tile
            label="Utilisation"
            value={`${kpis.utilisation}%`}
            note={`${kpis.sessions} ${kpis.sessions === 1 ? 'booking' : 'bookings'}`}
          />
          <Tile label="Revenue" value={formatPeso(kpis.revenueCentavos)} note="incl. unpaid" />
          <Tile
            label="Awaiting payment"
            value={formatPeso(kpis.awaitingCentavos)}
            note={`${kpis.awaitingCount} ${kpis.awaitingCount === 1 ? 'booking' : 'bookings'}`}
          />
        </dl>
      ) : (
        <div
          aria-hidden
          className="h-44 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
        />
      )}

      <section>
        <div className="flex items-baseline justify-between border-b border-border pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest">Bookings</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{rows.length} items</span>
        </div>
        {bookings.error && !bookings.data ? (
          <Alert tone="error">{errorMessage(bookings.error)}</Alert>
        ) : bookings.isPending ? (
          <div
            aria-hidden
            className="mt-3 h-32 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No bookings on this day.</p>
        ) : (
          <ul aria-label="Bookings this day" className="divide-y divide-border">
            {rows.map((b) => (
              <Row key={b.id} booking={b} now={now} />
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Click any open slot to book it. Use ← → to change day.
      </p>
    </aside>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-border p-4 odd:border-r [&:nth-child(-n+2)]:border-b">
      <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
      <dd className="text-xs text-muted-foreground">{note}</dd>
    </div>
  );
}

/** One line per booking; cancelled and lapsed ones stay listed, marked. */
function Row({ booking, now }: { booking: AdminBooking; now: number }) {
  const kind = blockKind(booking, now);
  const status = kind
    ? BLOCK_LABELS[kind]
    : liveStatus(booking, now) === 'EXPIRED'
      ? 'Expired'
      : 'Cancelled';
  return (
    <li>
      <Link
        href={`/staff/bookings/${booking.id}`}
        className={cn(
          'flex items-center gap-4 py-3 transition-colors duration-150 hover:bg-muted',
          !kind && 'text-muted-foreground',
        )}
      >
        <span className="w-16 shrink-0 text-sm font-bold tabular-nums">
          {formatHour(booking.starts_at)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{who(booking)}</span>
          <span className="block text-xs text-muted-foreground">
            {booking.court_name} · {booking.hours} h
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 rounded border border-border px-2 py-0.5 text-xs',
            kind === 'NO_SHOW' && 'line-through',
          )}
        >
          {status}
        </span>
      </Link>
    </li>
  );
}
