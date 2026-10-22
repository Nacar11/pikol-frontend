'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import { StatusBadge } from '@/features/bookings';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatDayLong, formatHour, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useAdminBooking, useStaffAction } from '../hooks/use-admin-booking';
import type { AdminBooking } from '../schemas';
import { staffActions } from '../staff-actions';
import { MarkPaidForm } from './mark-paid-form';
import { OutcomeButtons } from './outcome-buttons';
import { ReasonForm } from './reason-form';

const TYPE_LABELS: Record<AdminBooking['type'], string> = {
  PLAYER_BOOKING: 'Player booking',
  WALK_IN: 'Walk-in booking',
  MAINTENANCE: 'Maintenance closure',
};

export function AdminBookingNotFound() {
  return (
    <section className="space-y-3">
      <Alert tone="error">Booking not found</Alert>
      <Link
        href="/staff/schedule"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to the schedule
      </Link>
    </section>
  );
}

export function AdminBookingDetail({ id }: { id: number }) {
  const { data: booking, error, isPending } = useAdminBooking(id);
  const permissions = usePermissions().data ?? [];
  const action = useStaffAction(id);

  if (isPending) return <PageLoading label="Loading booking" />;
  // A failed background refetch keeps the booking already on screen.
  if (error && !booking) {
    return errorCode(error) === 'NOT_FOUND' ? (
      <AdminBookingNotFound />
    ) : (
      <Alert tone="error">{errorMessage(error)}</Alert>
    );
  }

  const allowed = staffActions(booking, permissions, Date.now());
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <Link href="/staff/schedule" className="text-sm text-muted-foreground hover:underline">
          Schedule
        </Link>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {booking.reference_code}
        </h1>
        <StatusBadge status={booking.display_status} payment={booking.payment_status} />
      </div>
      <Summary booking={booking} />
      {action.isError && <Alert tone="error">{errorMessage(action.error)}</Alert>}
      {allowed.has('markPaid') && (
        <MarkPaidForm
          pending={action.isPending}
          onPay={(method) => action.mutate({ action: 'markPaid', method })}
        />
      )}
      {allowed.has('outcome') && (
        <OutcomeButtons
          pending={action.isPending}
          onOutcome={(outcome) => action.mutate({ action: 'outcome', outcome })}
        />
      )}
      {allowed.has('cancel') && (
        <div className="space-y-2">
          <Alert tone="info">No refund is issued.</Alert>
          <ReasonForm
            label="Reason for cancelling"
            submitLabel="Cancel booking"
            pending={action.isPending}
            onSubmit={(reason) => action.mutate({ action: 'cancel', reason })}
          />
        </div>
      )}
      {allowed.has('reopen') && (
        <ReasonForm
          label="Why is the court reopening?"
          submitLabel="Reopen court"
          pending={action.isPending}
          onSubmit={(reason) => action.mutate({ action: 'reopen', reason })}
        />
      )}
    </section>
  );
}

function Summary({ booking }: { booking: AdminBooking }) {
  const closure = booking.type === 'MAINTENANCE';
  return (
    <div className="space-y-3 rounded border border-border bg-surface p-4 text-sm">
      <div>
        <p className="text-muted-foreground">{TYPE_LABELS[booking.type]}</p>
        <p className="font-medium">
          {booking.venue_name} · {booking.court_name}
        </p>
        <p>{formatDayLong(manilaDayOf(booking.starts_at))}</p>
        <p className="text-muted-foreground">
          {formatTimeRange(booking.starts_at, booking.ends_at)}
        </p>
      </div>
      {!closure && (
        <div className="border-t border-border pt-3">
          {booking.player ? (
            <>
              <p className="font-medium">
                {booking.player.first_name} {booking.player.last_name}
              </p>
              <p className="text-muted-foreground">{booking.player.email}</p>
            </>
          ) : (
            <p className="font-medium">Walk-in</p>
          )}
          {booking.payment_method && (
            <p className="text-muted-foreground">Paid by {booking.payment_method}</p>
          )}
        </div>
      )}
      {!closure && (
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
      )}
      {booking.notes && (
        <div className="border-t border-border pt-3">
          <p className="text-muted-foreground">Notes</p>
          <p>{booking.notes}</p>
        </div>
      )}
      {booking.cancellation_reason && (
        <div className="border-t border-border pt-3">
          <p className="text-muted-foreground">Cancellation reason</p>
          <p>{booking.cancellation_reason}</p>
        </div>
      )}
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
