'use client';

import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { errorMessage } from '@/lib/api-error';
import { useStaffVenue } from '../use-staff-venue';

/** Renders a venue page once the active venue is known. Keyed by venue, so
 * switching venue drops the page's form and edit state. */
export function VenueRequired({ children }: { children: (venueId: number) => React.ReactNode }) {
  const { venueId, isPending, error } = useStaffVenue();
  if (venueId !== null) return <div key={venueId}>{children(venueId)}</div>;
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  return isPending ? <PageLoading /> : <p className="text-muted-foreground">No venues yet.</p>;
}
