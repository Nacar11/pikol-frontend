'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityKeys } from '@/features/availability';
import { adminBookingsApi } from '../api';
import { adminBookingKeys } from '../keys';
import type { WalkInRequest } from '../schemas';

/** Books a walk-in. Never optimistic: nothing is booked until the 201 returns. */
export function useWalkIn(venueId: number, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: WalkInRequest) => adminBookingsApi.walkIn(req),
    onSuccess: (booking) => {
      qc.setQueryData(adminBookingKeys.detail(booking.id), booking);
      void qc.invalidateQueries({ queryKey: availabilityKeys.day(venueId, date) });
      void qc.invalidateQueries({ queryKey: adminBookingKeys.day(venueId, date) });
    },
  });
}
