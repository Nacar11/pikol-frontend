import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingDetail } from '@/features/bookings';
import { bookingsApi } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/schemas';
import { ApiError } from '@/lib/api-client';
import { navigateExternal } from '@/lib/navigate';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/bookings/api', () => ({
  bookingsApi: { get: vi.fn(), checkout: vi.fn(), cancel: vi.fn() },
}));
vi.mock('@/lib/navigate', () => ({ navigateExternal: vi.fn() }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const get = vi.mocked(bookingsApi).get;
const checkout = vi.mocked(bookingsApi).checkout;
const cancel = vi.mocked(bookingsApi).cancel;

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);
const STARTS = Date.UTC(2026, 9, 23, 10, 0, 0); // 6 PM Manila, 23 Oct

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 42,
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
    ends_at: new Date(STARTS + 2 * 3_600_000).toISOString(),
    hours: 2,
    slots: [
      { starts_at: new Date(STARTS).toISOString(), price_centavos: 60000 },
      { starts_at: new Date(STARTS + 3_600_000).toISOString(), price_centavos: 70000 },
    ],
    price_centavos: 130000,
    fee_centavos: 2000,
    total_centavos: 132000,
    payment_method: 'ONLINE',
    expires_at: new Date(NOW + 90_000).toISOString(),
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: new Date(NOW).toISOString(),
    ...over,
  };
}

function apiError(status: number, code: string, detail: string) {
  return new ApiError(status, { detail, code, request_id: 'r' });
}

function setup(cachedUrl?: string) {
  const qc = createQueryClient();
  if (cachedUrl) qc.setQueryData(['bookings', 'checkout', 42], cachedUrl);
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <BookingDetail id={42} />
    </QueryClientProvider>,
  );
  return { qc, invalidate };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Only the clock and the interval are faked; react-query keeps real timers.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(NOW);
  get.mockResolvedValue(booking());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BookingDetail', () => {
  it('shows the booking summary with per-hour prices, fee and total', async () => {
    setup();
    expect(await screen.findByText('PK-ABC123')).toBeInTheDocument();
    expect(screen.getByText(/Riverside/)).toBeInTheDocument();
    expect(screen.getByText(/Court 2/)).toBeInTheDocument();
    expect(screen.getByText('Friday, 23 October 2026')).toBeInTheDocument();
    expect(screen.getByText('6 PM – 8 PM')).toBeInTheDocument();
    expect(screen.getByText('₱600')).toBeInTheDocument();
    expect(screen.getByText('₱700')).toBeInTheDocument();
    expect(screen.getByText('₱20')).toBeInTheDocument();
    expect(screen.getByText('₱1,320')).toBeInTheDocument();
  });

  it('counts down to expiry, refetches at zero and shows the lapsed state', async () => {
    setup();
    expect(await screen.findByText('1:30')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);

    get.mockResolvedValue(
      booking({ booking_status: 'EXPIRED', display_status: 'EXPIRED', expires_at: null }),
    );
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(
        'Your hold has expired. If you already opened the payment page, paying now may not secure this court.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book again' })).toHaveAttribute(
      'href',
      '/venues/3?date=2026-10-23',
    );
  });

  it('keeps Pay disabled at 0:00 until the server answers', async () => {
    setup();
    await screen.findByText('1:30');
    get.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay ₱1,320' })).toBeDisabled();
  });

  it('keeps asking the server while it still says PENDING after 0:00', async () => {
    setup();
    await screen.findByText('1:30');
    // The client clock ran ahead: the server still holds the court at zero.
    get
      .mockResolvedValueOnce(booking())
      .mockResolvedValue(
        booking({ booking_status: 'EXPIRED', display_status: 'EXPIRED', expires_at: null }),
      );
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Pay ₱1,320' })).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });
    expect(
      await screen.findByText(
        'Your hold has expired. If you already opened the payment page, paying now may not secure this court.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay/ })).not.toBeInTheDocument();
  });

  it('keeps showing a loaded booking when a background refetch fails', async () => {
    setup();
    await screen.findByText('1:30');
    get.mockRejectedValue(apiError(429, 'RATE_LIMITED', 'Slow down.'));
    await act(async () => {
      vi.advanceTimersByTime(90_000);
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await act(async () => {}); // flush the failed refetch
    expect(screen.getByText('PK-ABC123')).toBeInTheDocument();
    expect(screen.queryByText('Slow down.')).not.toBeInTheDocument();
  });

  it('pays with the cached URL and does not call checkout', async () => {
    setup('https://maya.test/c');
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₱1,320' }));
    await waitFor(() => expect(navigateExternal).toHaveBeenCalledWith('https://maya.test/c'));
    expect(checkout).not.toHaveBeenCalled();
  });

  it('re-enables Pay when the browser restores the page from the back-forward cache', async () => {
    setup('https://maya.test/c');
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₱1,320' }));
    await waitFor(() => expect(navigateExternal).toHaveBeenCalledWith('https://maya.test/c'));
    expect(screen.getByRole('button', { name: 'Pay ₱1,320' })).toBeDisabled();
    const back = new Event('pageshow');
    Object.defineProperty(back, 'persisted', { value: true });
    act(() => {
      window.dispatchEvent(back);
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pay ₱1,320' })).toBeEnabled());
  });

  it('calls checkout once when no URL is cached, then redirects', async () => {
    checkout.mockResolvedValue({ ...booking(), checkout_url: 'https://maya.test/new' });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₱1,320' }));
    await waitFor(() => expect(navigateExternal).toHaveBeenCalledWith('https://maya.test/new'));
    expect(checkout).toHaveBeenCalledTimes(1);
  });

  it('refetches the booking when checkout says HOLD_NOT_LIVE', async () => {
    checkout.mockRejectedValue(apiError(409, 'HOLD_NOT_LIVE', 'The hold is no longer live.'));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Pay ₱1,320' }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(navigateExternal).not.toHaveBeenCalled();
  });

  it('tells the player when the last payment failed', async () => {
    get.mockResolvedValue(booking({ payment_status: 'FAILED' }));
    setup();
    expect(
      await screen.findByText('Your last payment did not go through. Try again.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pay ₱1,320' })).toBeEnabled();
  });

  it('shows the unhoused copy for EXPIRED and PAID', async () => {
    get.mockResolvedValue(
      booking({
        booking_status: 'EXPIRED',
        display_status: 'EXPIRED',
        payment_status: 'PAID',
        expires_at: null,
      }),
    );
    setup();
    expect(
      await screen.findByText(
        'We received your payment but could not secure the court. Staff will contact you about a refund or a new slot.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book again' })).not.toBeInTheDocument();
  });

  it('needs a second click to cancel, then shows the cancelled booking', async () => {
    const cancelled = booking({
      booking_status: 'CANCELLED',
      display_status: 'CANCELLED',
      expires_at: null,
    });
    cancel.mockResolvedValue(cancelled);
    const { invalidate } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    expect(cancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(42));
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
    expect(keys).toContainEqual(['bookings', 'mine']);
    expect(keys).toContainEqual(['availability']);
  });

  it('Keep it backs out of the confirmation', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('shows the server detail when the cancellation cutoff has passed', async () => {
    cancel.mockRejectedValue(
      apiError(409, 'CANCELLATION_CUTOFF_PASSED', 'Too late to cancel this booking.'),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    expect(await screen.findByText('Too late to cancel this booking.')).toBeInTheDocument();
  });

  it('warns "No refund" when cancelling a CONFIRMED and PAID booking', async () => {
    get.mockResolvedValue(
      booking({
        booking_status: 'CONFIRMED',
        display_status: 'CONFIRMED',
        payment_status: 'PAID',
        expires_at: null,
      }),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    expect(screen.getByText(/No refund/)).toBeInTheDocument();
  });

  it('renders IN_PROGRESS as a badge and offers no cancel', async () => {
    get.mockResolvedValue(
      booking({
        booking_status: 'CONFIRMED',
        display_status: 'IN_PROGRESS',
        payment_status: 'PAID',
        expires_at: null,
      }),
    );
    setup();
    expect(await screen.findByText('In progress')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay/ })).not.toBeInTheDocument();
  });

  it('renders not-found on 404 with a link to My bookings', async () => {
    get.mockRejectedValue(apiError(404, 'NOT_FOUND', 'Booking not found.'));
    setup();
    expect(await screen.findByText('Booking not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My bookings/ })).toHaveAttribute('href', '/bookings');
  });
});
