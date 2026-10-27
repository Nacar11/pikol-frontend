'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate, useStaffVenue } from '@/features/staff';
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
    <section key={venueId} className="space-y-8">
      <PageHeader
        section="Operations"
        title="Court closures"
        description="Block courts for maintenance, events or weather. Closed hours can't be booked and show hatched on the schedule."
      />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ClosureForm venueId={venueId} />
        <ClosureList venueId={venueId} />
      </div>
    </section>
  );
}
