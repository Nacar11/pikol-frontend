'use client';

import { PageHeader } from '@/components/layout/page-header';
import { StaffGate, VenueRequired } from '@/features/staff';
import { ClosureForm } from './closure-form';
import { ClosureList } from './closure-list';

export function ClosureAdmin() {
  return (
    <StaffGate permission="CLOSURE:Manage">
      <VenueRequired>
        {(venueId) => (
          <section className="space-y-8">
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
        )}
      </VenueRequired>
    </StaffGate>
  );
}
