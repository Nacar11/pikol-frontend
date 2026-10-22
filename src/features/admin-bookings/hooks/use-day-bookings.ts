'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { adminBookingsApi } from '../api';
import { adminBookingKeys } from '../keys';

/** Every booking the server returns for one venue-day, in server order.
 * Refetches every 30 s: holds lapse and players pay while the counter is open. */
export function useDayBookings(venueId: number, date: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: adminBookingKeys.day(venueId, date),
    queryFn: () => adminBookingsApi.day(venueId, date),
    enabled: status === 'authenticated',
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
