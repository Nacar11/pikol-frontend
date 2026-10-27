'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { availabilityKeys } from '@/features/availability';
import { adminBookingsApi } from '../api';
import { adminBookingKeys } from '../keys';
import type { AdminBooking, ManualPaymentMethod, Outcome } from '../schemas';

/** One booking in the signed-in user's scope. A 404 means unknown or out of scope. */
export function useAdminBooking(id: number) {
  const { status } = useAuth();
  return useQuery({
    queryKey: adminBookingKeys.detail(id),
    queryFn: () => adminBookingsApi.get(id),
    enabled: status === 'authenticated',
  });
}

type StaffActionRequest =
  | { action: 'markPaid'; method: ManualPaymentMethod }
  | { action: 'outcome'; outcome: Outcome }
  | { action: 'cancel'; reason: string }
  | { action: 'reopen'; reason: string };

function send(id: number, r: StaffActionRequest): Promise<AdminBooking> {
  switch (r.action) {
    case 'markPaid':
      return adminBookingsApi.markPaid(id, r.method);
    case 'outcome':
      return adminBookingsApi.outcome(id, r.outcome);
    case 'cancel':
      return adminBookingsApi.cancel(id, r.reason);
    case 'reopen':
      return adminBookingsApi.reopenClosure(id, r.reason);
  }
}

/** Runs one action route. Success writes the response into the detail cache;
 * an error refetches it, so the buttons always reflect the server. */
export function useStaffAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: StaffActionRequest) => send(id, r),
    onSuccess: (booking) => {
      qc.setQueryData(adminBookingKeys.detail(id), booking);
      void qc.invalidateQueries({ queryKey: adminBookingKeys.all });
      void qc.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: adminBookingKeys.detail(id) });
    },
  });
}
