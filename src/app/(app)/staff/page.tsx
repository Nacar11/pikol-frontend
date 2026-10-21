import type { Metadata } from 'next';
import { RequirePermission } from '@/features/auth';

export const metadata: Metadata = { title: 'Staff · Pikol' };

// Phase 8 replaces this with today's schedule and the staff console.
export default function StaffPage() {
  return (
    <RequirePermission code="BOOKING:ReadAny">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s schedule</h1>
        <p className="text-sm text-muted-foreground">
          The staff console — schedule, walk-ins, payments, closures — arrives in a later release.
        </p>
      </section>
    </RequirePermission>
  );
}
