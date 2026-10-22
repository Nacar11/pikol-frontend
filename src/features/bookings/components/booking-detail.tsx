'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatDayLong, formatHour, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useBooking } from '../hooks/use-booking';
import type { Booking } from '../schemas';
import { CancelBooking } from './cancel-booking';
import { HoldCountdown } from './hold-countdown';
import { PayButton } from './pay-button';
import { StatusBadge } from './status-badge';

export function BookingNotFound() {
  return (
    <section className="space-y-3">
      <Alert tone="error">Booking not found</Alert>
      <Link href="/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
        Go to My bookings
      </Link>
    </section>
  );
}

export function BookingDetail({ id }: { id: number }) {
  const { data: booking, error, isPending, refetch } = useBooking(id);
  // The `expires_at` that has run out on this clock; Pay stays off until the
  // server returns a booking with a different one (or a different status).
  const [elapsed, setElapsed] = useState<string | null>(null);

  if (isPending) return <PageLoading label="Loading booking" />;
  if (error) {
    return errorCode(error) === 'NOT_FOUND' ? (
      <BookingNotFound />
    ) : (
      <Alert tone="error">{errorMessage(error)}</Alert>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <Link href="/bookings" className="text-sm text-muted-foreground hover:underline">
          My bookings
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {booking.reference_code}
        </h1>
        <StatusBadge status={booking.display_status} payment={booking.payment_status} />
      </div>
      <Summary booking={booking} />
      <Actions
        booking={booking}
        elapsed={elapsed !== null && elapsed === booking.expires_at}
        onElapsed={() => {
          setElapsed(booking.expires_at);
          void refetch();
        }}
      />
    </section>
  );
}

function Summary({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-3 rounded border border-border bg-surface p-4 text-sm">
      <div>
        <p className="font-medium">
          {booking.venue_name} · {booking.court_name}
        </p>
        <p>{formatDayLong(manilaDayOf(booking.starts_at))}</p>
        <p className="text-muted-foreground">
          {formatTimeRange(booking.starts_at, booking.ends_at)}
        </p>
      </div>
      <dl className="space-y-1 border-t border-border pt-3">
        {booking.slots.map((slot) => (
          <Row
            key={slot.starts_at}
            label={formatHour(slot.starts_at)}
            value={slot.price_centavos}
          />
        ))}
        <Row label="Booking fee" value={booking.fee_centavos} />
        <Row label="Total" value={booking.total_centavos} strong />
      </dl>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between font-semibold' : 'flex justify-between'}>
      <dt>{label}</dt>
      <dd>{formatPeso(value)}</dd>
    </div>
  );
}

/** One block, chosen from the server's `display_status`; no client-side clock math. */
function Actions({
  booking,
  elapsed,
  onElapsed,
}: {
  booking: Booking;
  elapsed: boolean;
  onElapsed: () => void;
}) {
  const { display_status: status, payment_status: payment } = booking;

  if (status === 'PENDING') {
    return (
      <div className="space-y-3">
        {booking.expires_at && (
          <HoldCountdown expiresAt={booking.expires_at} onElapsed={onElapsed} />
        )}
        {payment === 'FAILED' && (
          <Alert tone="error">Your last payment did not go through. Try again.</Alert>
        )}
        <PayButton id={booking.id} totalCentavos={booking.total_centavos} disabled={elapsed} />
        <CancelBooking id={booking.id} warnNoRefund={false} />
      </div>
    );
  }
  if (status === 'EXPIRED' && payment !== 'PAID') {
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
  if (status === 'EXPIRED') {
    return (
      <Alert tone="error">
        We received your payment but could not secure the court. Staff will contact you about a
        refund or a new slot.
      </Alert>
    );
  }
  if (status === 'CONFIRMED') {
    return (
      <div className="space-y-3">
        <Alert tone="success">Your booking is confirmed. See you on court.</Alert>
        <CancelBooking id={booking.id} warnNoRefund={payment === 'PAID'} />
      </div>
    );
  }
  return null;
}
