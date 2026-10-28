'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { type Confirmation, ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import { ActionTimeline, StatusBadge } from '@/features/bookings';
import { SectionLabel } from '@/components/ui/section-label';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatDayLong, formatHour, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import {
  type StaffActionRequest,
  useAdminBooking,
  useAdminBookingEvents,
  useStaffAction,
} from '../hooks/use-admin-booking';
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

const PAYMENT_METHOD_LABELS: Record<NonNullable<AdminBooking['payment_method']>, string> = {
  CASH: 'Cash',
  MANUAL_GCASH: 'GCash (manual)',
  ONLINE: 'Online',
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
  // Every decision here asks first; the dialog holds the request until confirmed.
  const [asked, setAsked] = useState<StaffActionRequest | null>(null);

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
  const ask = (request: StaffActionRequest) => {
    action.reset();
    setAsked(request);
  };
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
      <Events id={id} />
      {action.isError && <Alert tone="error">{errorMessage(action.error)}</Alert>}
      {allowed.has('markPaid') && (
        <MarkPaidForm
          pending={action.isPending}
          onPay={(method) => ask({ action: 'markPaid', method })}
        />
      )}
      {allowed.has('outcome') && (
        <OutcomeButtons
          pending={action.isPending}
          onOutcome={(outcome) => ask({ action: 'outcome', outcome })}
        />
      )}
      {allowed.has('cancel') && (
        <div className="space-y-2">
          <Alert tone="info">No refund is issued.</Alert>
          <ReasonForm
            label="Reason for cancelling"
            submitLabel="Cancel booking"
            pending={action.isPending}
            onSubmit={(reason) => ask({ action: 'cancel', reason })}
          />
        </div>
      )}
      {allowed.has('reopen') && (
        <ReasonForm
          label="Why is the court reopening?"
          submitLabel="Reopen court"
          pending={action.isPending}
          onSubmit={(reason) => ask({ action: 'reopen', reason })}
        />
      )}
      <ConfirmDialog
        confirmation={asked && confirmationFor(asked, booking)}
        pending={action.isPending}
        onClose={() => setAsked(null)}
        onConfirm={() => {
          if (asked) action.mutate(asked, { onSettled: () => setAsked(null) });
        }}
      />
    </section>
  );
}

function Events({ id }: { id: number }) {
  const events = useAdminBookingEvents(id);
  return (
    <section
      aria-labelledby="action-events"
      className="space-y-3 rounded border border-border bg-surface p-4"
    >
      <SectionLabel as="h2" id="action-events">
        Action events
      </SectionLabel>
      {events.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events.isError ? (
        <p className="text-sm text-destructive">{errorMessage(events.error)}</p>
      ) : (
        <ActionTimeline events={events.data.data} showCourt={false} />
      )}
    </section>
  );
}

function confirmationFor(request: StaffActionRequest, booking: AdminBooking): Confirmation {
  const what = (
    <p>
      <span className="font-mono font-medium text-foreground">{booking.reference_code}</span> ·{' '}
      {booking.court_name} · {formatDayLong(manilaDayOf(booking.starts_at))},{' '}
      {formatTimeRange(booking.starts_at, booking.ends_at)}
    </p>
  );
  const reason = (r: string) => (
    <p>
      Reason: <span className="text-foreground">{r}</span>
    </p>
  );
  switch (request.action) {
    case 'markPaid': {
      const how = PAYMENT_METHOD_LABELS[request.method];
      return {
        title: `Collect ${formatPeso(booking.total_centavos)} by ${how}?`,
        body: (
          <>
            {what}
            <p>
              Only confirm once the money is in hand
              {request.method === 'MANUAL_GCASH' ? ' and the transfer shows in GCash' : ''}.
            </p>
          </>
        ),
        confirmLabel: `Mark paid · ${how}`,
      };
    }
    case 'outcome':
      return request.outcome === 'COMPLETED'
        ? {
            title: 'Mark as completed?',
            body: (
              <>
                {what}
                <p>The player showed up and played.</p>
              </>
            ),
            confirmLabel: 'Mark completed',
          }
        : {
            title: 'Mark as a no-show?',
            body: (
              <>
                {what}
                <p>Nobody came for this booking.</p>
              </>
            ),
            confirmLabel: 'Mark no-show',
          };
    case 'cancel':
      return {
        title: 'Cancel this booking?',
        body: (
          <>
            {what}
            {reason(request.reason)}
            <p>The hours open up for booking again. No refund is issued.</p>
          </>
        ),
        confirmLabel: 'Cancel booking',
        cancelLabel: 'Keep booking',
        destructive: true,
      };
    case 'reopen':
      return {
        title: 'Reopen this court?',
        body: (
          <>
            {what}
            {reason(request.reason)}
            <p>The closure ends and these hours can be booked again.</p>
          </>
        ),
        confirmLabel: 'Reopen court',
        cancelLabel: 'Keep closed',
      };
  }
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
            <p className="text-muted-foreground">
              Paid by {PAYMENT_METHOD_LABELS[booking.payment_method]}
            </p>
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
