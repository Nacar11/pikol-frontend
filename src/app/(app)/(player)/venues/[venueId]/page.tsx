'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { AvailabilityGrid, DateStrip, useAvailability } from '@/features/availability';
import { canBookOnline, usePermissions } from '@/features/auth';
import { BookVenueDay } from '@/features/bookings';
import { useVenue } from '@/features/catalog';
import { errorMessage } from '@/lib/api-error';
import { formatDayLong, isManilaDay, manilaToday } from '@/lib/manila';

export default function VenuePage() {
  // useSearchParams needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <VenueDay />
    </Suspense>
  );
}

function VenueDay() {
  const params = useParams<{ venueId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const venueId = Number(params.venueId);
  const { venue, error } = useVenue(venueId);

  const rawDate = search.get('date');
  const date = rawDate && isManilaDay(rawDate) ? rawDate : null;

  useEffect(() => {
    if (!date) router.replace(`${pathname}?date=${manilaToday()}`);
  }, [date, router, pathname]);

  if (!Number.isInteger(venueId) || venue === 'not-found') {
    return (
      <section className="space-y-3">
        <Alert tone="error">That venue could not be found.</Alert>
        <Link href="/venues" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to venues
        </Link>
      </section>
    );
  }
  if (!venue && error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (!venue || !date) return <PageLoading />;

  return (
    <section className="space-y-4">
      <div>
        <Link href="/venues" className="text-sm text-muted-foreground hover:underline">
          All venues
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{venue.name}</h1>
        <p className="text-sm text-muted-foreground">{formatDayLong(date)}</p>
      </div>
      <DateStrip value={date} onChange={(d) => router.replace(`${pathname}?date=${d}`)} />
      <DayGrid venueId={venueId} date={date} />
    </section>
  );
}

/** Players get the booking grid; staff see it read-only. */
function DayGrid({ venueId, date }: { venueId: number; date: string }) {
  const { data: permissions, isPending } = usePermissions();
  if (isPending) return <PageLoading label="Loading availability" />;
  if (permissions && canBookOnline(permissions)) {
    return <BookVenueDay venueId={venueId} date={date} />;
  }
  return <ReadOnlyGrid venueId={venueId} date={date} />;
}

function ReadOnlyGrid({ venueId, date }: { venueId: number; date: string }) {
  const { data, error, isPending } = useAvailability(venueId, date);
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (isPending) return <PageLoading label="Loading availability" />;
  return <AvailabilityGrid data={data} selection={null} />;
}
