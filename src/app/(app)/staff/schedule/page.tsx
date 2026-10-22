'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { Schedule } from '@/features/admin-bookings';
import { isManilaDay, manilaToday } from '@/lib/manila';

export default function SchedulePage() {
  // useSearchParams needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <ScheduleDay />
    </Suspense>
  );
}

function ScheduleDay() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const rawDate = search.get('date');
  const date = rawDate && isManilaDay(rawDate) ? rawDate : null;

  function withDate(day: string): string {
    const next = new URLSearchParams(search.toString());
    next.set('date', day);
    return `${pathname}?${next.toString()}`;
  }

  useEffect(() => {
    if (!date) router.replace(withDate(manilaToday()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (!date) return <PageLoading />;
  return <Schedule date={date} onDateChange={(d) => router.replace(withDate(d))} />;
}
