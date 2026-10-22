import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { ClosureAdmin } from '@/features/setup';

export default function StaffClosuresPage() {
  // useStaffVenue reads useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <ClosureAdmin />
    </Suspense>
  );
}
