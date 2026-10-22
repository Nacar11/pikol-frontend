import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { manilaDayOf } from '@/lib/manila';
import type { Booking } from '../schemas';

/** ADR 0002 §2: a Maya checkout outlives the hold, so the copy must say so. */
export function LapsedNotice({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-3">
      <Alert tone="info">
        Your hold has expired. If you already opened the payment page, paying now may not secure
        this court.
      </Alert>
      <Link
        href={`/venues/${booking.venue_id}?date=${manilaDayOf(booking.starts_at)}`}
        className="inline-flex h-10 items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Book again
      </Link>
    </div>
  );
}

/** `EXPIRED` + `PAID`: the `needs_resolution` case. */
export function UnhousedNotice() {
  return (
    <Alert tone="error">
      We received your payment but could not secure the court. Staff will contact you about a refund
      or a new slot.
    </Alert>
  );
}
