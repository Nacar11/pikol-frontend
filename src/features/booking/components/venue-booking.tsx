'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/components/ui/snackbar';
import { DateStrip, useAvailability } from '@/features/availability';
import { errorMessage } from '@/lib/api-error';
import { formatDayLong } from '@/lib/manila';
import { useCreateCheckout } from '../hooks/use-checkouts';
import { dropUnavailable, toItems, togglePick, type Pick } from '../picks';
import { CourtHourGrid } from './court-hour-grid';
import { PickBar } from './pick-bar';

/** The days the strip offers; the server enforces the real horizon. */
const STRIP_DAYS = 14;

/** One venue's courts × hours. Picks survive a date change (one payment may
 * span days) but live in this component, so another venue starts empty. */
export function VenueBooking({
  venueId,
  date,
  onDateChange,
}: {
  venueId: number;
  date: string;
  onDateChange: (day: string) => void;
}) {
  const router = useRouter();
  const grid = useAvailability(venueId, date);
  const create = useCreateCheckout();
  const [picks, setPicks] = useState<Pick[]>([]);

  // A refetch (each minute, or after a 409) drops picks someone else took.
  const data = grid.data;
  useEffect(() => {
    if (data) setPicks((p) => dropUnavailable(p, data));
  }, [data]);

  const pay = () =>
    create.mutate(toItems(picks), {
      onSuccess: (checkout) => router.push(`/book/checkout/${checkout.id}`),
      onError: (err) => notify.error(errorMessage(err, 'Could not hold those hours.')),
    });

  return (
    <div className="space-y-4">
      <DateStrip value={date} onChange={onDateChange} days={STRIP_DAYS} />
      <h2 className="text-lg font-semibold">{formatDayLong(date)}</h2>
      {grid.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : grid.isError ? (
        <p className="text-sm text-destructive">Could not load this day.</p>
      ) : grid.data.courts.length === 0 ? (
        <p className="text-sm text-muted-foreground">This venue has no courts open yet.</p>
      ) : (
        <CourtHourGrid
          grid={grid.data}
          isPicked={(courtId, slot) =>
            picks.some((p) => p.court_id === courtId && p.starts_at === slot.starts_at)
          }
          onTap={(courtId, courtName, slot) =>
            setPicks((p) =>
              togglePick(p, {
                court_id: courtId,
                court_name: courtName,
                day: date,
                starts_at: slot.starts_at,
                price_centavos: slot.price_centavos,
              }),
            )
          }
        />
      )}
      <PickBar
        picks={picks}
        feePercent={grid.data?.convenience_fee_percent ?? '0'}
        paying={create.isPending}
        onPay={pay}
      />
    </div>
  );
}
