'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatDayLong, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { useConfirmBooking } from '../hooks/use-confirm-booking';
import { LapsedNotice, UnhousedNotice } from './outcome-notices';

const LINK = 'text-sm text-primary underline-offset-4 hover:underline';

export function CheckoutNotFound() {
  return (
    <section className="space-y-3">
      <Alert tone="error">We couldn&apos;t find that booking</Alert>
      <Link href="/bookings" className={LINK}>
        Go to My bookings
      </Link>
    </section>
  );
}

export function CheckoutReturn({ bookingId }: { bookingId: number }) {
  const { booking, outcome, timedOut, error } = useConfirmBooking(bookingId);

  if (!booking) {
    if (error) {
      return errorCode(error) === 'NOT_FOUND' ? (
        <CheckoutNotFound />
      ) : (
        <Alert tone="error">{errorMessage(error)}</Alert>
      );
    }
    return <Confirming />;
  }

  switch (outcome) {
    case 'confirmed':
      return (
        <section className="space-y-3" aria-live="polite">
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re booked</h1>
          <p className="font-mono text-lg">{booking.reference_code}</p>
          <p className="text-sm">
            {booking.venue_name} · {booking.court_name}
            <br />
            {formatDayLong(manilaDayOf(booking.starts_at))},{' '}
            {formatTimeRange(booking.starts_at, booking.ends_at)}
          </p>
          <Link href={`/bookings/${booking.id}`} className={LINK}>
            View booking
          </Link>
        </section>
      );
    case 'failed':
      return (
        <section className="space-y-3">
          <Alert tone="error">Payment didn&apos;t go through</Alert>
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex h-10 items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </Link>
        </section>
      );
    case 'unhoused':
      return <UnhousedNotice />;
    case 'lapsed':
      return <LapsedNotice booking={booking} />;
    case 'cancelled':
      return (
        <section className="space-y-3">
          <Alert tone="info">This booking was cancelled.</Alert>
          <Link href={`/bookings/${booking.id}`} className={LINK}>
            View booking
          </Link>
        </section>
      );
    default:
      return timedOut ? (
        <section className="space-y-3">
          <Alert tone="info">
            We&apos;re still waiting for the payment provider. Your booking will update in My
            Bookings.
          </Alert>
          <Link href="/bookings" className={LINK}>
            Go to My bookings
          </Link>
        </section>
      ) : (
        <Confirming />
      );
  }
}

function Confirming() {
  return (
    <section className="space-y-2 text-center" aria-live="polite">
      <p className="text-sm text-muted-foreground">Confirming your booking…</p>
      <PageLoading label="Confirming your booking" />
    </section>
  );
}
