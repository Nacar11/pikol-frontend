'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { adminBookingsApi } from '../api';
import { adminBookingKeys } from '../keys';
import { REFETCH_MS } from './use-day-bookings';

/** The strip's per-day utilisation for the 14 days from `from`. Refetched
 * with the day's bookings, so a walk-in moves its bar too. */
export function useOccupancy(venueId: number, from: string, days = 14) {
  const { status } = useAuth();
  return useQuery({
    queryKey: adminBookingKeys.occupancy(venueId, from, days),
    queryFn: () => adminBookingsApi.occupancy(venueId, from, days),
    enabled: status === 'authenticated',
    refetchInterval: REFETCH_MS,
    refetchIntervalInBackground: false,
  });
}
