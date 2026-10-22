'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { availabilityApi } from '../api';
import { availabilityKeys } from '../keys';

/** One request per day view. Refetches each minute while the tab is visible
 * so a cell somebody else just took does not linger. */
export function useAvailability(venueId: number, date: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: availabilityKeys.day(venueId, date),
    queryFn: () => availabilityApi.day(venueId, date),
    enabled: status === 'authenticated',
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
