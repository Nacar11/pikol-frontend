'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { availabilityApi } from '../api';
import { availabilityKeys } from '../keys';

/** One request per day view. Refetches each minute (staff ask for faster)
 * while the tab is visible so a cell somebody else just took does not linger. */
export function useAvailability(
  venueId: number,
  date: string,
  { refetchInterval = 60_000 }: { refetchInterval?: number } = {},
) {
  const { status } = useAuth();
  return useQuery({
    queryKey: availabilityKeys.day(venueId, date),
    queryFn: () => availabilityApi.day(venueId, date),
    enabled: status === 'authenticated',
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}
