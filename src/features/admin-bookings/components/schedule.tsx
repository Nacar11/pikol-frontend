'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/ui/snackbar';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import {
  availabilityKeys,
  reconcile,
  subtotalCentavos,
  tapCell,
  toHoldRequest,
  useAvailability,
  type Selection,
} from '@/features/availability';
import { useStaffVenue } from '@/features/staff';
import { errorCode, errorMessage } from '@/lib/api-error';
import { addDays, formatDayLong, formatTimeRange, manilaHourNow, manilaToday } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useWalkIn } from '../hooks/use-admin-booking-mutations';
import { adminBookingKeys } from '../keys';
import { REFETCH_MS, useDayBookings } from '../hooks/use-day-bookings';
import { useNow } from '../hooks/use-now';
import { blocksFor, courtHours, nextOpen, staffSelectable } from '../schedule-model';
import { DayGlance } from './day-glance';
import { ScheduleHeader } from './schedule-header';
import { ScheduleLegend } from './schedule-legend';
import { StaffCourtGrid } from './staff-court-grid';
import { WalkInBar } from './walk-in-bar';
import { WeekStrip } from './week-strip';

function useDayKeys(date: string, onDateChange: (day: string) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') onDateChange(addDays(date, -1));
      if (e.key === 'ArrowRight') onDateChange(addDays(date, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [date, onDateChange]);
}

export function Schedule({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (day: string) => void;
}) {
  const { venueId, venue, isPending, error, venues } = useStaffVenue();
  const { data: permissions } = usePermissions();
  const canWalkIn = permissions?.includes('BOOKING:CreateWalkIn') ?? false;
  // Bumped by "New booking"; the day below answers by selecting the next
  // open hour.
  const [newBooking, setNewBooking] = useState(0);
  useDayKeys(date, onDateChange);
  return (
    <div className="gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="min-w-0 space-y-4">
        <ScheduleHeader
          venueName={venue?.name ?? null}
          date={date}
          onDateChange={onDateChange}
          onNewBooking={
            canWalkIn && venueId !== null ? () => setNewBooking((n) => n + 1) : undefined
          }
        />
        {venueId !== null ? (
          <>
            <WeekStrip venueId={venueId} value={date} onChange={onDateChange} />
            {/* Keyed so a new venue or day starts with no selection and no stale notes. */}
            <VenueDay
              key={`${venueId}-${date}`}
              venueId={venueId}
              date={date}
              newBooking={newBooking}
            />
          </>
        ) : error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : isPending ? (
          <PageLoading label="Loading venues" />
        ) : venues.length === 0 ? (
          <p className="text-sm text-muted-foreground">There are no venues yet.</p>
        ) : null}
      </section>
      {/* Beside the grid on wide screens; below it otherwise. */}
      {venueId !== null && (
        <div className="mt-8 border-border xl:mt-0 xl:border-l xl:pl-8">
          <DayGlance venueId={venueId} date={date} />
        </div>
      )}
    </div>
  );
}

function VenueDay({
  venueId,
  date,
  newBooking,
}: {
  venueId: number;
  date: string;
  newBooking: number;
}) {
  const qc = useQueryClient();
  const { data: permissions } = usePermissions();
  const canWalkIn = permissions?.includes('BOOKING:CreateWalkIn') ?? false;
  const { data, error, isPending, dataUpdatedAt } = useAvailability(venueId, date, {
    refetchInterval: REFETCH_MS,
  });
  const bookings = useDayBookings(venueId, date);
  const now = useNow();
  const walkIn = useWalkIn(venueId, date);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notes, setNotes] = useState('');
  // "Book walk-in" asks first: one tap must not take a court.
  const [confirming, setConfirming] = useState(false);

  // A cell somebody else just took must not survive into a 409.
  useEffect(() => {
    if (data) setSelection((sel) => reconcile(sel, data, staffSelectable));
  }, [data, dataUpdatedAt]);

  // "New booking": the next open hour on the first court, raising the bar.
  const handled = useRef(newBooking);
  useEffect(() => {
    if (newBooking === handled.current || !data) return;
    handled.current = newBooking;
    const next = nextOpen(data, date === manilaToday() ? manilaHourNow() : 0);
    if (next) setSelection(next);
    else notify.info('No open hours left on this day.');
  }, [newBooking, data, date]);

  function submit() {
    if (!selection || !data) return;
    const req = toHoldRequest(selection, data);
    const trimmed = notes.trim();
    walkIn.mutate(trimmed ? { ...req, notes: trimmed } : req, {
      onSuccess: (booking) => {
        setSelection(null);
        setNotes('');
        notify.success(`Walk-in booked · ${booking.reference_code}`);
      },
      onSettled: () => setConfirming(false),
      onError: (err) => {
        notify.error(errorMessage(err));
        if (errorCode(err) === 'SLOT_UNAVAILABLE') {
          setSelection(null);
          void qc.invalidateQueries({ queryKey: availabilityKeys.day(venueId, date) });
          void qc.invalidateQueries({ queryKey: adminBookingKeys.day(venueId, date) });
        }
      },
    });
  }

  const court = selection && data?.courts.find((c) => c.court_id === selection.court_id);
  const first = selection && court?.slots[selection.start];
  const blocks = data ? blocksFor(data, bookings.data?.data ?? [], now) : [];
  const totals = (data?.courts ?? []).reduce(
    (sum, c) => {
      const { booked, closed } = courtHours(blocks, c.court_id);
      return { booked: sum.booked + booked, bookable: sum.bookable + 24 - closed };
    },
    { booked: 0, bookable: 0 },
  );

  return (
    <div className="space-y-4">
      {error && !data ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isPending ? (
        <PageLoading label="Loading availability" />
      ) : (
        <>
          <ScheduleLegend booked={totals.booked} bookable={totals.bookable} />
          <StaffCourtGrid
            data={data}
            blocks={blocks}
            selection={selection}
            scrollToHour={date === manilaToday() ? manilaHourNow() : null}
            onCellTap={
              canWalkIn
                ? (courtId, index) =>
                    setSelection((sel) => tapCell(sel, data, courtId, index, staffSelectable))
                : undefined
            }
          />
        </>
      )}
      {canWalkIn && data && selection && court && first && (
        <WalkInBar
          courtName={court.name}
          startsAt={first.starts_at}
          hours={selection.end - selection.start + 1}
          subtotal={subtotalCentavos(selection, data)}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={() => setConfirming(true)}
          pending={walkIn.isPending}
        />
      )}
      <ConfirmDialog
        confirmation={
          confirming && data && selection && court && first
            ? {
                title: 'Book this walk-in?',
                body: (
                  <>
                    <p className="font-medium text-foreground">
                      {court.name} · {formatDayLong(date)}
                    </p>
                    <p>
                      {formatTimeRange(
                        first.starts_at,
                        new Date(
                          Date.parse(first.starts_at) +
                            (selection.end - selection.start + 1) * 3_600_000,
                        ).toISOString(),
                      )}{' '}
                      · {selection.end - selection.start + 1}{' '}
                      {selection.end === selection.start ? 'hour' : 'hours'} ·{' '}
                      {formatPeso(subtotalCentavos(selection, data))}
                    </p>
                    {notes.trim() && <p>Notes: {notes.trim()}</p>}
                    <p>It is confirmed at once and stays unpaid until you collect payment.</p>
                  </>
                ),
                confirmLabel: 'Book walk-in',
              }
            : null
        }
        pending={walkIn.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={submit}
      />
    </div>
  );
}
