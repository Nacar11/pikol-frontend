'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { availabilityKeys } from '@/features/availability';
import { useAuth } from '@/features/auth';
import { checkoutApi } from '../api';
import { checkoutKeys } from '../keys';
import type { Checkout, CheckoutItem } from '../schemas';

/** Result page polling: every 3 s while pending, for up to 2 minutes, then
 * the customer is offered "Check again" (design call 9). */
export const POLL_MS = 3_000;
export const POLL_FOR_MS = 120_000;

export function useCheckout(id: number, { poll = false }: { poll?: boolean } = {}) {
  const { status } = useAuth();
  const [since] = useState(() => Date.now());
  return useQuery({
    queryKey: checkoutKeys.detail(id),
    queryFn: () => checkoutApi.get(id),
    enabled: status === 'authenticated',
    refetchInterval: (query) =>
      poll && query.state.data?.status === 'PENDING' && Date.now() - since < POLL_FOR_MS
        ? POLL_MS
        : false,
  });
}

export function useMyCheckouts(page: number) {
  const { status } = useAuth();
  return useQuery({
    queryKey: checkoutKeys.list(page),
    queryFn: () => checkoutApi.list(page),
    enabled: status === 'authenticated',
  });
}

function useStore() {
  const qc = useQueryClient();
  return (checkout: Checkout) => {
    qc.setQueryData(checkoutKeys.detail(checkout.id), checkout);
    void qc.invalidateQueries({ queryKey: checkoutKeys.lists() });
    void qc.invalidateQueries({ queryKey: availabilityKeys.all });
  };
}

/** Pay now. Never optimistic: nothing is held until the 201 returns. */
export function useCreateCheckout() {
  const store = useStore();
  return useMutation({
    mutationFn: (items: CheckoutItem[]) => checkoutApi.create(items),
    onSuccess: store,
  });
}

export function usePay() {
  const store = useStore();
  return useMutation({ mutationFn: (id: number) => checkoutApi.pay(id), onSuccess: store });
}

export function useCancelCheckout() {
  const store = useStore();
  return useMutation({ mutationFn: (id: number) => checkoutApi.cancel(id), onSuccess: store });
}

export function useRefreshPayment() {
  const store = useStore();
  return useMutation({ mutationFn: (id: number) => checkoutApi.refresh(id), onSuccess: store });
}
