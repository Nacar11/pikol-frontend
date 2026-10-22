import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { availabilityApi } from '@/features/availability/api';
import type { Availability } from '@/features/availability/schemas';
import { AuthContext } from '@/features/auth/auth-provider';
import { BookVenueDay } from '@/features/bookings';
import { bookingsApi } from '@/features/bookings/api';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { router } from '../auth/render';

vi.mock('@/features/availability/api', () => ({ availabilityApi: { day: vi.fn() } }));
vi.mock('@/features/bookings/api', () => ({ bookingsApi: { create: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const day = vi.mocked(availabilityApi).day;
const create = vi.mocked(bookingsApi).create;

const MIDNIGHT = Date.UTC(2026, 9, 22, 16, 0, 0);

function grid(booked: number[] = []): Availability {
  return {
    venue_id: 1,
    date: '2026-10-23',
    courts: [
      {
        court_id: 7,
        name: 'Court 2',
        slots: Array.from({ length: 24 }, (_, i) => ({
          starts_at: new Date(MIDNIGHT + i * 3_600_000).toISOString(),
          hour: i,
          status: booked.includes(i) ? ('BOOKED' as const) : ('AVAILABLE' as const),
          price_centavos: 60000,
        })),
      },
    ],
  };
}

function apiError(status: number, code: string, detail: string) {
  return new ApiError(status, { detail, code, request_id: 'r' });
}

function setup() {
  const qc = createQueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user: null, login: vi.fn(), logout: vi.fn() }}
      >
        <BookVenueDay venueId={1} date="2026-10-23" />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { qc, invalidate };
}

function tree(qc: ReturnType<typeof createQueryClient>, date: string) {
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user: null, login: vi.fn(), logout: vi.fn() }}
      >
        <BookVenueDay venueId={1} date={date} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

async function selectTwoHours() {
  await userEvent.click(await screen.findByLabelText('Court 2, 6 PM, available, ₱600'));
  await userEvent.click(screen.getByLabelText('Court 2, 7 PM, available, ₱600'));
}

beforeEach(() => {
  vi.clearAllMocks();
  day.mockResolvedValue(grid());
});

describe('BookVenueDay', () => {
  it('shows the selection in the hold bar with a subtotal', async () => {
    setup();
    await selectTwoHours();
    expect(
      screen.getByText('Court 2 · 6 PM – 8 PM · 2 hours · ₱1,200 + booking fee'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hold these hours' })).toBeEnabled();
  });

  it('is not optimistic: pending shows no held cell until the request resolves', async () => {
    let resolve!: (v: never) => void;
    create.mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    const pending = await screen.findByRole('button', { name: /Holding/ });
    expect(pending).toBeDisabled();
    expect(screen.queryByLabelText(/held/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Court 2, 6 PM, selected, ₱600')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => resolve(new Promise(() => {}) as never));
  });

  it('sends the server starts_at and hours, then navigates to the pay page on 201', async () => {
    create.mockResolvedValue({ id: 42, checkout_url: 'https://maya.test/c' } as never);
    const { qc } = setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/bookings/42'));
    expect(create).toHaveBeenCalledWith({
      court_id: 7,
      starts_at: grid().courts[0]!.slots[18]!.starts_at,
      hours: 2,
    });
    expect(qc.getQueryData(['bookings', 'checkout', 42])).toBe('https://maya.test/c');
    // The URL must outlive the 15-minute hold, not the default 5-minute gcTime.
    const cached = qc.getQueryCache().find({ queryKey: ['bookings', 'checkout', 42] });
    expect(cached?.gcTime).toBeGreaterThanOrEqual(20 * 60_000);
  });

  it('toasts SLOT_UNAVAILABLE, clears the selection and refetches the grid', async () => {
    create.mockRejectedValue(apiError(409, 'SLOT_UNAVAILABLE', 'Someone just booked that.'));
    setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Someone just booked that.'));
    expect(screen.queryByRole('button', { name: 'Hold these hours' })).not.toBeInTheDocument();
    await waitFor(() => expect(day).toHaveBeenCalledTimes(2));
  });

  it('shows HOLD_LIMIT inline with a link to My bookings and keeps the selection', async () => {
    create.mockRejectedValue(apiError(409, 'HOLD_LIMIT', 'You have too many open holds.'));
    setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    expect(await screen.findByText('You have too many open holds.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to My bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Hold these hours' })).toBeInTheDocument();
  });

  it('toasts other errors and keeps the selection', async () => {
    create.mockRejectedValue(apiError(422, 'TOO_SOON', 'Too soon to book that hour.'));
    setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Too soon to book that hour.'));
    expect(screen.getByRole('button', { name: 'Hold these hours' })).toBeInTheDocument();
  });

  it('sends the player to My bookings on PAYMENT_PROVIDER_UNAVAILABLE', async () => {
    create.mockRejectedValue(apiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payments are down.'));
    const { invalidate } = setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/bookings?notice=provider'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bookings', 'mine'] });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('removes the hold bar when a refetched grid books a selected cell', async () => {
    const { qc } = setup();
    await selectTwoHours();
    day.mockResolvedValue(grid([19]));
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['availability'] });
    });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Hold these hours' })).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Court 2, 6 PM, available, ₱600')).toBeInTheDocument();
  });

  it('drops the selection when the day changes, even if the same cells are available', async () => {
    const qc = createQueryClient();
    const view = render(tree(qc, '2026-10-23'));
    await selectTwoHours();
    expect(screen.getByRole('button', { name: 'Hold these hours' })).toBeInTheDocument();
    day.mockResolvedValue({ ...grid(), date: '2026-10-24' });
    view.rerender(tree(qc, '2026-10-24'));
    await screen.findByLabelText('Court 2, 6 PM, available, ₱600');
    expect(screen.queryByRole('button', { name: 'Hold these hours' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/selected/)).not.toBeInTheDocument();
  });

  it('clears the HOLD_LIMIT alert when the selection changes', async () => {
    create.mockRejectedValue(apiError(409, 'HOLD_LIMIT', 'You have too many open holds.'));
    setup();
    await selectTwoHours();
    await userEvent.click(screen.getByRole('button', { name: 'Hold these hours' }));
    await screen.findByText('You have too many open holds.');
    await userEvent.click(screen.getByLabelText('Court 2, 9 PM, available, ₱600'));
    expect(screen.queryByText('You have too many open holds.')).not.toBeInTheDocument();
  });
});
