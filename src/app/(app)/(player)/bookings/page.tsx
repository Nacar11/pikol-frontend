import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { MyBookings } from '@/features/bookings';

export default function BookingsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MyBookings />
    </Suspense>
  );
}
