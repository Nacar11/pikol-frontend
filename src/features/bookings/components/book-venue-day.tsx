'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import {
  AvailabilityGrid,
  availabilityKeys,
  HoldBar,
  reconcile,
  subtotalCentavos,
  tapCell,
  toHoldRequest,
  useAvailability,
  type Selection,
} from '@/features/availability';
import { errorCode, errorMessage } from '@/lib/api-error';
import { useCreateHold } from '../hooks/use-booking-mutations';

/** The player's grid: select consecutive hours, then ask the server to hold
 * them. Selection is local and shown as *selected*; only a 201 makes a hold. */
export function BookVenueDay({ venueId, date }: { venueId: number; date: string }) {
  // Keyed so a new venue or day starts with no selection and no stale alert.
  return <VenueDaySelection key={`${venueId}-${date}`} venueId={venueId} date={date} />;
}

function VenueDaySelection({ venueId, date }: { venueId: number; date: string }) {
  const qc = useQueryClient();
  const { data, error, isPending, dataUpdatedAt } = useAvailability(venueId, date);
  const hold = useCreateHold(venueId, date);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [limitDetail, setLimitDetail] = useState<string | null>(null);

  // A cell somebody else just took must not survive into a 409.
  useEffect(() => {
    if (data) setSelection((sel) => reconcile(sel, data));
  }, [data, dataUpdatedAt]);

  if (error && !data) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (isPending) return <PageLoading label="Loading availability" />;

  const court = selection && data.courts.find((c) => c.court_id === selection.court_id);
  const first = selection && court?.slots[selection.start];

  function submit() {
    if (!selection || !data) return;
    setLimitDetail(null);
    hold.mutate(toHoldRequest(selection, data), {
      onError: (err) => {
        const code = errorCode(err);
        if (code === 'PAYMENT_PROVIDER_UNAVAILABLE') return;
        if (code === 'HOLD_LIMIT') {
          setLimitDetail(errorMessage(err));
          return;
        }
        toast.error(errorMessage(err));
        if (code === 'SLOT_UNAVAILABLE') {
          setSelection(null);
          void qc.invalidateQueries({ queryKey: availabilityKeys.day(venueId, date) });
        }
      },
    });
  }

  return (
    <div className="space-y-3">
      <AvailabilityGrid
        data={data}
        selection={selection}
        onCellTap={(courtId, index) => {
          setLimitDetail(null);
          setSelection((sel) => tapCell(sel, data, courtId, index));
        }}
      />
      {limitDetail && (
        <Alert tone="error">
          <p>{limitDetail}</p>
          <Link href="/bookings" className="underline underline-offset-4">
            Go to My bookings
          </Link>
        </Alert>
      )}
      {selection && court && first && (
        <HoldBar
          courtName={court.name}
          startsAt={first.starts_at}
          hours={selection.end - selection.start + 1}
          subtotal={subtotalCentavos(selection, data)}
          onSubmit={submit}
          pending={hold.isPending}
        />
      )}
    </div>
  );
}
