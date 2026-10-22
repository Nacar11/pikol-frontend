'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { availabilityKeys } from '@/features/availability';
import { errorCode } from '@/lib/api-error';
import { bookingsApi } from '../api';
import { bookingKeys } from '../keys';
import { returnOutcome } from '../return-outcome';
import type { Booking } from '../schemas';

const POLL_MS = 2000;
const REFRESH_AGAIN_MS = 15_000;
const WINDOW_MS = 30_000;

/**
 * The redirect from Maya confirms nothing. Poll our own database for up to
 * 30 s, and ask the server to re-fetch the payment at mount and at 15 s in
 * case the webhook is late or lost.
 */
export function useConfirmBooking(id: number) {
  const qc = useQueryClient();
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const secondRefresh = useRef(false);
  const announced = useRef(false);

  const query = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingsApi.get(id),
    refetchInterval: (q) => {
      if (errorCode(q.state.error) === 'NOT_FOUND') return false;
      const data = q.state.data;
      if (data && returnOutcome(data) !== 'pending') return false;
      return Date.now() - started.current < WINDOW_MS ? POLL_MS : false;
    },
  });
  const booking = query.data;
  const outcome = booking ? returnOutcome(booking) : 'pending';

  const refresh = () => {
    bookingsApi
      .refreshPayment(id)
      .then((b) =>
        // A refresh may resolve late. Only a confirmation is protected: it is the one
        // outcome the server never walks back (FAILED and lapsed holds can still flip to PAID).
        qc.setQueryData<Booking>(bookingKeys.detail(id), (old) =>
          old && returnOutcome(old) === 'confirmed' ? old : b,
        ),
      )
      .catch(() => {
        // Rate-limited or provider trouble: the poll carries on regardless.
      });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [id]);

  useEffect(() => {
    if (outcome !== 'pending' || elapsed >= WINDOW_MS) return;
    const timer = setInterval(() => setElapsed(Date.now() - started.current), 1000);
    return () => clearInterval(timer);
  }, [outcome, elapsed]);

  useEffect(() => {
    if (outcome === 'pending' && elapsed >= REFRESH_AGAIN_MS && !secondRefresh.current) {
      secondRefresh.current = true;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh closes over stable values
  }, [outcome, elapsed]);

  useEffect(() => {
    if (outcome === 'confirmed' && !announced.current) {
      announced.current = true;
      void qc.invalidateQueries({ queryKey: bookingKeys.mine() });
      void qc.invalidateQueries({ queryKey: availabilityKeys.all });
    }
  }, [outcome, qc]);

  const timedOut = outcome === 'pending' && elapsed >= WINDOW_MS;
  return { booking, outcome, timedOut, error: query.error, isPending: query.isPending };
}
