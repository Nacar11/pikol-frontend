'use client';

import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { UserGroups } from '@/features/groups';

export default function UserGroupsPage() {
  // useStaffVenue reads useSearchParams, which needs a Suspense boundary for `next build`.
  return (
    <Suspense fallback={<PageLoading />}>
      <UserGroups />
    </Suspense>
  );
}
