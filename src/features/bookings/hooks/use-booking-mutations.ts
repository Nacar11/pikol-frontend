'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { availabilityKeys } from '@/features/availability';
import { errorCode } from '@/lib/api-error';
import { navigateExternal } from '@/lib/navigate';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';
import type { Booking, HoldRequest } from '../schemas';

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

/**
 * Sends the player to Maya. Uses the checkout URL cached from the hold, unless
 * the last attempt FAILED (that checkout is spent) or nothing is cached, in
 * which case it asks the server for a fresh one.
 */
export function usePay(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const failed = qc.getQueryData<Booking>(bookingKeys.detail(id))?.payment_status === 'FAILED';
      const cached = failed ? undefined : qc.getQueryData<string>(bookingKeys.checkout(id));
      if (cached) return cached;
      const { checkout_url } = await bookingsApi.checkout(id);
      qc.setQueryData(bookingKeys.checkout(id), checkout_url);
      return checkout_url;
    },
    onSuccess: (url) => navigateExternal(url),
    onError: (err) => {
      // The hold lapsed or was paid meanwhile: show whatever the server says now.
      if (errorCode(err) === 'HOLD_NOT_LIVE') {
        void qc.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      }
    },
  });
}

export function useCancelBooking(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.cancel(id),
    onSuccess: (booking) => {
      qc.setQueryData(bookingKeys.detail(id), booking);
      void qc.invalidateQueries({ queryKey: bookingKeys.mine() });
      void qc.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}
