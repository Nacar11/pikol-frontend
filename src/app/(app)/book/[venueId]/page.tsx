'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PageLoading } from '@/components/ui/page-loading';
import { VenueBooking } from '@/features/booking';
import { useVenues } from '@/features/catalog';
import { isManilaDay, manilaToday } from '@/lib/manila';

function VenuePage() {
  const venueId = Number(useParams<{ venueId: string }>().venueId);
  const search = useSearchParams();
  const router = useRouter();
  const asked = search.get('date');
  const date = asked && isManilaDay(asked) ? asked : manilaToday();
  const venue = useVenues().data?.data.find((v) => v.id === venueId);
  return (
    <>
      <PageHeader section="Book" title={venue?.name ?? 'Venue'} />
      <VenueBooking
        venueId={venueId}
        date={date}
        onDateChange={(day) => router.replace(`/book/${venueId}?date=${day}`, { scroll: false })}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VenuePage />
    </Suspense>
  );
}
