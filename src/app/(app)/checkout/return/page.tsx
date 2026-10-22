'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { CheckoutNotFound, CheckoutReturn } from '@/features/bookings';

/** Only `booking_id` is read; the rest of the query string is ignored on purpose. */
function ReturnContent() {
  const raw = useSearchParams().get('booking_id');
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : 0;
  if (id <= 0) return <CheckoutNotFound />;
  return <CheckoutReturn bookingId={id} />;
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReturnContent />
    </Suspense>
  );
}
