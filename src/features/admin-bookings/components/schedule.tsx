'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import {
  AvailabilityGrid,
  availabilityKeys,
  DateStrip,
  reconcile,
  subtotalCentavos,
  tapCell,
  toHoldRequest,
  useAvailability,
  type Selection,
} from '@/features/availability';
import { useStaffVenue } from '@/features/staff';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatDayLong } from '@/lib/manila';
import { REFETCH_MS } from '../hooks/use-day-bookings';
import { useWalkIn } from '../hooks/use-admin-booking-mutations';
import { adminBookingKeys } from '../keys';
import { DayBookings } from './day-bookings';
import { WalkInBar } from './walk-in-bar';

/** Staff may also pick `PAST`: free but too soon for a player, which is the
 * walk-in-now case. */
const staffSelectable = (s: string): boolean => s === 'AVAILABLE' || s === 'PAST';

/** The staff home screen: the grid, the walk-in bar and the day's bookings. */
export function Schedule({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (day: string) => void;
}) {
  const { venueId, isPending, error, venues } = useStaffVenue();
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">{formatDayLong(date)}</p>
        </div>
      </div>
      <DateStrip value={date} onChange={onDateChange} start={-7} days={21} />
      {venueId !== null ? (
        // Keyed so a new venue or day starts with no selection and no stale notes.
        <VenueDay key={`${venueId}-${date}`} venueId={venueId} date={date} />
      ) : error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isPending ? (
        <PageLoading label="Loading venues" />
      ) : venues.length === 0 ? (
        <p className="text-sm text-muted-foreground">There are no venues yet.</p>
      ) : null}
    </section>
  );
}

function VenueDay({ venueId, date }: { venueId: number; date: string }) {
  const qc = useQueryClient();
  const { data: permissions } = usePermissions();
  const canWalkIn = permissions?.includes('BOOKING:CreateWalkIn') ?? false;
  const { data, error, isPending, dataUpdatedAt } = useAvailability(venueId, date, {
    refetchInterval: REFETCH_MS,
  });
  const walkIn = useWalkIn(venueId, date);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notes, setNotes] = useState('');

  // A cell somebody else just took must not survive into a 409.
  useEffect(() => {
    if (data) setSelection((sel) => reconcile(sel, data, staffSelectable));
  }, [data, dataUpdatedAt]);

  function submit() {
    if (!selection || !data) return;
    const req = toHoldRequest(selection, data);
    const trimmed = notes.trim();
    walkIn.mutate(trimmed ? { ...req, notes: trimmed } : req, {
      onSuccess: (booking) => {
        setSelection(null);
        setNotes('');
        toast.success(`Walk-in booked · ${booking.reference_code}`);
      },
      onError: (err) => {
        toast.error(errorMessage(err));
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

  return (
    <div className="space-y-4">
      {error && !data ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isPending ? (
        <PageLoading label="Loading availability" />
      ) : (
        <AvailabilityGrid
          data={data}
          selection={selection}
          selectable={staffSelectable}
          onCellTap={
            canWalkIn
              ? (courtId, index) =>
                  setSelection((sel) => tapCell(sel, data, courtId, index, staffSelectable))
              : undefined
          }
        />
      )}
      {canWalkIn && data && selection && court && first && (
        <WalkInBar
          courtName={court.name}
          startsAt={first.starts_at}
          hours={selection.end - selection.start + 1}
          subtotal={subtotalCentavos(selection, data)}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={submit}
          pending={walkIn.isPending}
        />
      )}
      <DayBookings venueId={venueId} date={date} />
    </div>
  );
}
