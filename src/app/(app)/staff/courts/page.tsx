import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { CourtAdmin } from '@/features/setup';

export default function StaffCourtsPage() {
  // useStaffVenue reads useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <CourtAdmin />
    </Suspense>
  );
}
