import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { ResolutionBadge } from '@/features/admin-bookings';
import { StaffOnly, StaffShell, StaffVenueSync } from '@/features/staff';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  // StaffVenueSync reads useSearchParams, which needs a Suspense boundary for
  // `next build`. It sits outside StaffOnly so that check is made with the
  // active venue's permissions.
  return (
    <Suspense fallback={<PageLoading />}>
      <StaffVenueSync>
        <StaffOnly>
          <StaffShell badges={{ '/staff/resolution': <ResolutionBadge /> }}>{children}</StaffShell>
        </StaffOnly>
      </StaffVenueSync>
    </Suspense>
  );
}
