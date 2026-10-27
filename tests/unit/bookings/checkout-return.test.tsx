import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutReturnPage from '@/app/(app)/(player)/checkout/return/page';
import { bookingsApi } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/schemas';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { setSearch } from '../auth/render';

vi.mock('@/features/bookings/api', () => ({
  bookingsApi: { get: vi.fn(), refreshPayment: vi.fn() },
}));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const get = vi.mocked(bookingsApi).get;
const refresh = vi.mocked(bookingsApi).refreshPayment;

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);
const STARTS = Date.UTC(2026, 9, 23, 10, 0, 0);

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 7,
    reference_code: 'PK-ABC123',
    court_id: 7,
    venue_id: 3,
    court_name: 'Court 2',
    venue_name: 'Riverside',
    type: 'PLAYER_BOOKING',
    booking_status: 'PENDING',
    payment_status: 'UNPAID',
    display_status: 'PENDING',
    starts_at: new Date(STARTS).toISOString(),
    ends_at: new Date(STARTS + 3_600_000).toISOString(),
    hours: 1,
    slots: [{ starts_at: new Date(STARTS).toISOString(), price_centavos: 60000 }],
    price_centavos: 60000,
    fee_centavos: 1000,
    total_centavos: 61000,
    payment_method: 'ONLINE',
    expires_at: new Date(NOW + 900_000).toISOString(),
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: new Date(NOW).toISOString(),
    ...over,
  };
}

const PAID = {
  booking_status: 'CONFIRMED',
  payment_status: 'PAID',
  display_status: 'CONFIRMED',
} as const;

function setup() {
  const qc = createQueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <CheckoutReturnPage />
    </QueryClientProvider>,
  );
  return { invalidate, qc };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Only the clock and the interval are faked; react-query keeps real timers.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(NOW);
  setSearch('booking_id=7');
  get.mockResolvedValue(booking());
  refresh.mockResolvedValue(booking());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkout return page', () => {
  it('confirms only after the t=15s refresh flips the booking, calling refresh twice', async () => {
    refresh.mockResolvedValueOnce(booking()).mockResolvedValueOnce(booking(PAID));
    const { invalidate } = setup();
    expect(await screen.findByText('Confirming your booking…')).toBeInTheDocument();
    await advance(10_000);
    expect(screen.queryByText("You're booked")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    await advance(6_000);
    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    expect(screen.getByText('PK-ABC123')).toBeInTheDocument();
    expect(screen.getByText(/Riverside/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute(
      'href',
      '/bookings/7',
    );
    expect(refresh).toHaveBeenCalledTimes(2);
    const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(keys).toEqual(['["bookings","mine"]', '["availability"]']);
    await advance(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('never lets a late PENDING refresh undo a confirmation from a poll', async () => {
    let resolveRefresh: (b: Booking) => void = () => {};
    refresh.mockReturnValueOnce(
      new Promise<Booking>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    get.mockResolvedValueOnce(booking()).mockResolvedValue(booking(PAID));
    const { qc } = setup();
    await advance(3_000);
    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    await act(async () => {
      resolveRefresh(booking());
    });
    await act(async () => {}); // flush the refresh's .then
    expect(qc.getQueryData<Booking>(['bookings', 'detail', 7])?.payment_status).toBe('PAID');
    expect(screen.getByText("You're booked")).toBeInTheDocument();
    expect(screen.queryByText('Confirming your booking…')).not.toBeInTheDocument();
  });

  it('lets a refresh result replace a stale FAILED with the real CONFIRMED/PAID', async () => {
    get.mockResolvedValue(booking({ payment_status: 'FAILED' }));
    let resolveRefresh: (b: Booking) => void = () => {};
    refresh.mockReturnValueOnce(
      new Promise<Booking>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    setup();
    // FAILED is provisional while the mount refresh is out: no failure flash.
    await waitFor(() => expect(get).toHaveBeenCalled());
    await act(async () => {}); // let the FAILED booking land
    expect(screen.getByText('Confirming your booking…')).toBeInTheDocument();
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
    await act(async () => {
      resolveRefresh(booking(PAID));
    });
    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
  });

  it('confirms a retry that succeeded after a FAILED attempt, never showing the failure', async () => {
    const failed = booking({ payment_status: 'FAILED' });
    get.mockResolvedValue(failed);
    refresh
      .mockRejectedValueOnce(new ApiError(502, { detail: 'down', code: 'X', request_id: 'r' }))
      .mockImplementationOnce(async () => {
        get.mockResolvedValue(booking(PAID));
        return booking(PAID);
      });
    setup();
    expect(await screen.findByText('Confirming your booking…')).toBeInTheDocument();
    for (let t = 0; t < 16; t++) {
      await advance(1_000);
      expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
    }
    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
  });

  it('shows success immediately when the webhook already landed, and stops polling', async () => {
    get.mockResolvedValue(booking(PAID));
    refresh.mockResolvedValue(booking(PAID));
    setup();
    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    const calls = get.mock.calls.length;
    await advance(10_000);
    expect(get.mock.calls.length).toBe(calls);
  });

  it('polls every 2 s and times out at 30 s without ever claiming success', async () => {
    setup();
    await screen.findByText('Confirming your booking…');
    await advance(31_000);
    expect(
      screen.getByText(
        "We're still waiting for the payment provider. Your booking will update in My Bookings.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("You're booked")).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to My bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    // A player who backed out of Maya can go back to Pay.
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute(
      'href',
      '/bookings/7',
    );
    const calls = get.mock.calls.length;
    expect(calls).toBeGreaterThan(5);
    await advance(10_000);
    expect(get.mock.calls.length).toBe(calls);
  });

  it('keeps polling when refresh-payment is rate limited', async () => {
    refresh.mockRejectedValue(
      new ApiError(429, { detail: 'slow', code: 'RATE_LIMITED', request_id: 'r' }),
    );
    setup();
    await screen.findByText('Confirming your booking…');
    await advance(4_000);
    expect(get.mock.calls.length).toBeGreaterThan(1);
    expect(screen.getByText('Confirming your booking…')).toBeInTheDocument();
  });

  it('shows Try again for a failed payment only after the t=15s refresh returns', async () => {
    get.mockResolvedValue(booking({ payment_status: 'FAILED' }));
    refresh.mockResolvedValue(booking({ payment_status: 'FAILED' }));
    setup();
    expect(await screen.findByText('Confirming your booking…')).toBeInTheDocument();
    await advance(14_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Payment didn't go through")).not.toBeInTheDocument();
    expect(screen.getByText('Confirming your booking…')).toBeInTheDocument();
    await advance(1_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Payment didn't go through")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', '/bookings/7');
    // Still FAILED when the window ends: the failure copy, not the timeout copy.
    await advance(16_000);
    expect(screen.getByText("Payment didn't go through")).toBeInTheDocument();
    expect(screen.queryByText(/still waiting for the payment provider/)).not.toBeInTheDocument();
  });

  it('shows the lapsed copy for an expired unpaid hold', async () => {
    const lapsed = booking({ booking_status: 'EXPIRED', display_status: 'EXPIRED' });
    get.mockResolvedValue(lapsed);
    refresh.mockResolvedValue(lapsed);
    setup();
    expect(
      await screen.findByText(
        'Your hold has expired. If you already opened the payment page, paying now may not secure this court.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the unhoused copy for an expired paid booking', async () => {
    const unhoused = booking({
      booking_status: 'EXPIRED',
      payment_status: 'PAID',
      display_status: 'EXPIRED',
    });
    get.mockResolvedValue(unhoused);
    refresh.mockResolvedValue(unhoused);
    setup();
    expect(
      await screen.findByText(
        'We received your payment but could not secure the court. Staff will contact you about a refund or a new slot.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a cancelled booking with a link to it', async () => {
    const cancelled = booking({ booking_status: 'CANCELLED', display_status: 'CANCELLED' });
    get.mockResolvedValue(cancelled);
    refresh.mockResolvedValue(cancelled);
    setup();
    expect(await screen.findByText('This booking was cancelled.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute(
      'href',
      '/bookings/7',
    );
  });

  it('shows not-found for a 404 and stops polling', async () => {
    const notFound = new ApiError(404, { detail: 'nope', code: 'NOT_FOUND', request_id: 'r' });
    get.mockRejectedValue(notFound);
    refresh.mockRejectedValue(notFound);
    setup();
    expect(await screen.findByText("We couldn't find that booking")).toBeInTheDocument();
    const calls = get.mock.calls.length;
    await advance(10_000);
    expect(get.mock.calls.length).toBe(calls);
  });

  it('shows not-found without any request for a non-numeric booking_id', () => {
    setSearch('booking_id=abc');
    setup();
    expect(screen.getByText("We couldn't find that booking")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows not-found when booking_id is missing', () => {
    setSearch('');
    setup();
    expect(screen.getByText("We couldn't find that booking")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('never renders success from the query string while the server says PENDING', async () => {
    setSearch('booking_id=7&status=success');
    setup();
    await screen.findByText('Confirming your booking…');
    await advance(5_000);
    expect(screen.queryByText("You're booked")).not.toBeInTheDocument();
  });
});
