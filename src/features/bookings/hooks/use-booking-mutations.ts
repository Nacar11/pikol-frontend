'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { availabilityKeys } from '@/features/availability';
import { errorCode } from '@/lib/api-error';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';
import type { HoldRequest } from '../schemas';

/** Places a hold. Never optimistic: nothing is held until the 201 returns. */
export function useCreateHold(venueId: number, date: string) {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: HoldRequest) => bookingsApi.create(req),
    onSuccess: ({ checkout_url, ...booking }) => {
      qc.setQueryData(bookingKeys.detail(booking.id), booking);
      qc.setQueryData(bookingKeys.checkout(booking.id), checkout_url);
      void qc.invalidateQueries({ queryKey: availabilityKeys.day(venueId, date) });
      void qc.invalidateQueries({ queryKey: bookingKeys.mine() });
      router.push(`/bookings/${booking.id}`);
    },
    onError: (err) => {
      // The hold WAS committed but the body carries no id: send the player to
      // My Bookings, where it is listed (spec §5.3 step 3).
      if (errorCode(err) === 'PAYMENT_PROVIDER_UNAVAILABLE') {
        void qc.invalidateQueries({ queryKey: bookingKeys.mine() });
        router.push('/bookings?notice=provider');
      }
    },
  });
}
