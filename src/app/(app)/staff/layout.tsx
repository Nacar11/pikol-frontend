import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate, StaffVenueSync } from '@/features/staff';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  // StaffVenueSync reads useSearchParams, which needs a Suspense boundary for
  // `next build`. It sits outside the gate so the gate's permission check is
  // already made for the active venue.
  return (
    <Suspense fallback={<PageLoading />}>
      <StaffVenueSync>
        <StaffGate permission="BOOKING:ReadAny">{children}</StaffGate>
      </StaffVenueSync>
    </Suspense>
  );
}
