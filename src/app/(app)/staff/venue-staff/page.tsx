'use client';

import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { VenueStaff } from '@/features/groups';

export default function VenueStaffPage() {
  // useStaffVenue reads useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <VenueStaff />
    </Suspense>
  );
}
