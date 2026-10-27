'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { staffKeys } from '../keys';
import { useStaffVenue } from '../use-staff-venue';

const VENUE_LIST = JSON.stringify(staffKeys.myVenues());

function isVenueList(key: readonly unknown[]): boolean {
  return JSON.stringify(key) === VENUE_LIST;
}

/**
 * Feeds the active venue to every staff request as X-Venue-ID, and refetches
 * everything when it changes — permissions included, since they are per
 * venue (ADR 0003). Mounted once, in the staff layout.
 *
 * The ref is written during render on purpose: this component renders before
 * its children, so the header is already right when their queries fire. An
 * effect would run after the children's, and their first fetch would go out
 * for the previous venue.
 */
export function StaffVenueSync({ children }: { children: React.ReactNode }) {
  const { venueId } = useStaffVenue();
  const queryClient = useQueryClient();
  const current = useRef<number | null>(venueId);
  current.current = venueId;
  useState(() => apiClient().setVenueProvider(() => current.current));
  const previous = useRef(venueId);

  // Re-registered in the effect too: StrictMode's mount → unmount → mount
  // would otherwise leave the provider cleared.
  useEffect(() => {
    const client = apiClient();
    client.setVenueProvider(() => current.current);
    return () => client.setVenueProvider(null);
  }, []);

  useEffect(() => {
    // Only a real venue counts as a change: "none yet" is the venue list
    // still loading, not a switch.
    if (venueId === null || previous.current === venueId) return;
    previous.current = venueId;
    // Drop, not just refetch: stale data from the last venue must not show,
    // and stale permissions must not gate the new one. Never the venue list
    // itself — it decides venueId, so resetting it empties the venue, which
    // would read as another change and reset again, forever.
    void queryClient.resetQueries({ predicate: (q) => !isVenueList(q.queryKey) });
  }, [venueId, queryClient]);

  return <>{children}</>;
}
