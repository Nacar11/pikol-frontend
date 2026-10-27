import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '@/components/ui/snackbar';
import { AuthContext } from '@/features/auth/auth-provider';
import { availabilityApi } from '@/features/availability/api';
import type { Availability, GridStatus } from '@/features/availability';
import { checkoutApi } from '@/features/booking/api';
import { VenueBooking } from '@/features/booking/components/venue-booking';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { router } from '../auth/render';
import { checkoutFixture } from './fixtures';

vi.mock('@/features/availability/api', () => ({ availabilityApi: { day: vi.fn() } }));
vi.mock('@/features/booking/api', () => ({ checkoutApi: { create: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);
vi.mock('@/components/ui/snackbar', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const H = 3_600_000;
const midnight = (day: string) => Date.parse(`${day}T00:00:00+08:00`);

function grid(day: string, taken: Record<number, GridStatus> = {}): Availability {
  return {
    venue_id: 3,
    date: day,
    convenience_fee_percent: '3.00',
    courts: [1, 2].map((n) => ({
      court_id: n,
      name: `Court ${n}`,
      slots: Array.from({ length: 24 }, (_, h) => ({
        starts_at: new Date(midnight(day) + h * H).toISOString(),
        hour: h,
        status: n === 1 ? (taken[h] ?? 'AVAILABLE') : 'AVAILABLE',
        price_centavos: 50000,
      })),
    })),
  };
}

const user = { id: 1, is_customer: true } as never;

function show(date: string) {
  const onDateChange = vi.fn();
  const qc = createQueryClient();
  const view = render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
      >
        <VenueBooking venueId={3} date={date} onDateChange={onDateChange} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return {
    onDateChange,
    rerender: (d: string) =>
      view.rerender(
        <QueryClientProvider client={qc}>
          <AuthContext.Provider
            value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
          >
            <VenueBooking venueId={3} date={d} onDateChange={onDateChange} />
          </AuthContext.Provider>
        </QueryClientProvider>,
      ),
  };
}

const DAY = '2026-11-02';
const NEXT = '2026-11-03';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(availabilityApi.day).mockImplementation(async (_v, day) => grid(day));
});

describe('VenueBooking', () => {
  it('sums picks on two courts in the bar', async () => {
    show(DAY);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' }));
    await userEvent.click(screen.getByRole('button', { name: 'Court 2, 10 AM, ₱500' }));

    const bar = screen.getByRole('region', { name: 'Your picks' });
    expect(within(bar).getByText('2 hours · 2 courts · ₱1,000 + ₱30 fee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Court 1, 10 AM, ₱500' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps earlier picks when the date changes, under their own day', async () => {
    const { rerender } = show(DAY);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' }));
    rerender(NEXT);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 2, 7 PM, ₱500' }));

    const bar = screen.getByRole('region', { name: 'Your picks' });
    expect(within(bar).getByText('2 hours · 2 courts · ₱1,000 + ₱30 fee')).toBeInTheDocument();
    expect(within(bar).getByText('Monday, 2 November')).toBeInTheDocument();
    expect(within(bar).getByText('Tuesday, 3 November')).toBeInTheDocument();
  });

  it('shows a taken hour hatched, not as a button', async () => {
    vi.mocked(availabilityApi.day).mockResolvedValue(grid(DAY, { 18: 'BOOKED', 9: 'CLOSED' }));
    show(DAY);
    await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' });

    expect(screen.queryByRole('button', { name: /Court 1, 6 PM/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Court 1, 6 PM, taken')).toHaveClass('bg-hatch');
    expect(screen.getByLabelText('Court 1, 9 AM, closed')).toHaveClass('bg-hatch');
  });

  it('sends the merged items on Pay now and opens the hold page', async () => {
    vi.mocked(checkoutApi.create).mockResolvedValue(checkoutFixture({ id: 41 }));
    show(DAY);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' }));
    await userEvent.click(screen.getByRole('button', { name: 'Court 1, 11 AM, ₱500' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(checkoutApi.create).toHaveBeenCalledWith([
        { court_id: 1, starts_at: new Date(midnight(DAY) + 10 * H).toISOString(), hours: 2 },
      ]),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/book/checkout/41'));
  });

  it('disables Pay now while the request is in flight', async () => {
    vi.mocked(checkoutApi.create).mockReturnValue(new Promise(() => {}));
    show(DAY);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Holding/ })).toBeDisabled());
    expect(checkoutApi.create).toHaveBeenCalledTimes(1);
  });

  it('names the taken hour and drops it from the picks on a 409', async () => {
    vi.mocked(checkoutApi.create).mockRejectedValue(
      new ApiError(409, {
        detail: 'These hours were just taken: Court 1 · Mon 02 Nov, 10 AM',
        code: 'SLOT_UNAVAILABLE',
      }),
    );
    show(DAY);
    await userEvent.click(await screen.findByRole('button', { name: 'Court 1, 10 AM, ₱500' }));
    await userEvent.click(screen.getByRole('button', { name: 'Court 2, 10 AM, ₱500' }));
    vi.mocked(availabilityApi.day).mockResolvedValue(grid(DAY, { 10: 'BOOKED' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        'These hours were just taken: Court 1 · Mon 02 Nov, 10 AM',
      ),
    );
    const bar = await screen.findByRole('region', { name: 'Your picks' });
    await waitFor(() =>
      expect(within(bar).getByText('1 hour · 1 court · ₱500 + ₱15 fee')).toBeInTheDocument(),
    );
  });
});
