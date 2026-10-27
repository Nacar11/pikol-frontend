'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useStaffVenue } from '../use-staff-venue';

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
    if (previous.current === venueId) return;
    previous.current = venueId;
    // Drop, not just refetch: stale data from the last venue must not show,
    // and stale permissions must not gate the new one.
    void queryClient.resetQueries();
  }, [venueId, queryClient]);

  return <>{children}</>;
}
