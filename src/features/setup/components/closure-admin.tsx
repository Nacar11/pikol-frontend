'use client';

import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate, useStaffVenue, VenuePicker } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { ClosureForm } from './closure-form';
import { ClosureList } from './closure-list';

export function ClosureAdmin() {
  return (
    <StaffGate permission="CLOSURE:Manage">
      <Closures />
    </StaffGate>
  );
}

function Closures() {
  const { venueId, isPending, error } = useStaffVenue();
  if (venueId === null) {
    if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
    return isPending ? <PageLoading /> : <p className="text-muted-foreground">No venues yet.</p>;
  }
  // Keyed so a venue switch drops the form state.
  return (
    <section key={venueId} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Court closures</h1>
        <VenuePicker />
      </div>
      <ClosureForm venueId={venueId} />
      <ClosureList venueId={venueId} />
    </section>
  );
}
