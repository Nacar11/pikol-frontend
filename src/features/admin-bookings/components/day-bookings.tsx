'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { StatusBadge } from '@/features/bookings';
import { errorMessage } from '@/lib/api-error';
import { formatTimeRange } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useDayBookings } from '../hooks/use-day-bookings';
import type { AdminBooking } from '../schemas';

function who(b: AdminBooking): string {
  if (b.type === 'MAINTENANCE') return 'Closure';
  if (b.type === 'WALK_IN') return 'Walk-in';
  return b.player ? `${b.player.first_name} ${b.player.last_name}` : 'Player';
}

/** The day's bookings in server order. The grid never reveals who booked
 * (spec §7.2); this list is where staff see names. */
export function DayBookings({ venueId, date }: { venueId: number; date: string }) {
  const { data, error, isPending } = useDayBookings(venueId, date);
  if (error && !data) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (isPending) return <PageLoading label="Loading bookings" />;
  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings on this day.</p>;
  }
  return (
    <ul
      aria-label="Bookings this day"
      className="divide-y divide-border rounded border border-border bg-surface"
    >
      {data.data.map((b) => (
        <li key={b.id}>
          <Link
            href={`/staff/bookings/${b.id}`}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">{formatTimeRange(b.starts_at, b.ends_at)}</span>
            <span>{b.court_name}</span>
            <span>{who(b)}</span>
            <StatusBadge status={b.display_status} payment={b.payment_status} />
            <span>{formatPeso(b.total_centavos)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
