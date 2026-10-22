import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import { ResolutionQueue } from '@/features/admin-bookings';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import { authApi } from '@/features/auth/api';
import { AuthContext } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: { unfulfilled: vi.fn(), resolve: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

const api = vi.mocked(adminBookingsApi);
const user = { id: 1, venue_id: 1, role: 'VENUE_STAFF' } as never;
const START = Date.UTC(2026, 9, 23, 10, 0, 0);
const HOUR = 3_600_000;

function booking(id: number, over: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id,
    reference_code: `PKL-${id}`,
    court_id: 7,
    venue_id: 1,
    court_name: 'Court 2',
    venue_name: 'Riverside',
    type: 'PLAYER_BOOKING',
    booking_status: 'EXPIRED',
    payment_status: 'PAID',
    display_status: 'EXPIRED',
    starts_at: new Date(START).toISOString(),
    ends_at: new Date(START + HOUR).toISOString(),
    hours: 1,
    slots: [{ starts_at: new Date(START).toISOString(), price_centavos: 60000 }],
    price_centavos: 60000,
    fee_centavos: 2000,
    total_centavos: 62000,
    payment_method: 'ONLINE',
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: `[system] court taken ${id}`,
    created_at: '2026-10-22T00:00:00Z',
    player: { id: 9, first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com' },
    created_by_user_id: null,
    ...over,
  } as AdminBooking;
}

function page(data: AdminBooking[], has_more = false, p = 1) {
  return { data, total: data.length, page: p, limit: 20, has_more };
}

function setup(permissions = ['BOOKING:ReadAny', 'BOOKING:CancelAny']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
      >
        <ResolutionQueue />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ResolutionQueue', () => {
  it('renders rows with their notes and a link to the detail', async () => {
    api.unfulfilled.mockResolvedValue(page([booking(1), booking(2)]));
    setup();
    expect(await screen.findByText(/court taken 1/)).toBeInTheDocument();
    expect(screen.getByText(/court taken 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /PKL-1.*Ana Cruz/ })).toHaveAttribute(
      'href',
      '/staff/bookings/1',
    );
    expect(screen.getAllByText('Riverside · Court 2')).toHaveLength(2);
    expect(screen.getAllByText(/620/).length).toBeGreaterThan(0);
  });

  it('requires text, posts the resolution and removes the row', async () => {
    const u = userEvent.setup();
    api.unfulfilled.mockResolvedValueOnce(page([booking(1), booking(2)]));
    api.resolve.mockImplementation(() => {
      api.unfulfilled.mockResolvedValue(page([booking(2)]));
      return Promise.resolve(booking(1));
    });
    setup();
    await screen.findByText(/court taken 1/);
    await u.click((await screen.findAllByRole('button', { name: 'Resolve' }))[0]!);
    const submit = within(screen.getByRole('textbox').closest('form')!).getByRole('button', {
      name: 'Resolve',
    });
    expect(submit).toBeDisabled();
    await u.type(screen.getByLabelText('How was this settled? (refund, rebook, void)'), 'Refunded');
    await u.click(submit);
    await waitFor(() => expect(api.resolve).toHaveBeenCalledWith(1, 'Refunded'));
    await waitFor(() => expect(screen.queryByText(/court taken 1/)).not.toBeInTheDocument());
    expect(screen.getByText(/court taken 2/)).toBeInTheDocument();
  });

  it('renders the server detail on NOT_FLAGGED and refetches', async () => {
    const u = userEvent.setup();
    api.unfulfilled.mockResolvedValue(page([booking(1)]));
    api.resolve.mockRejectedValue(
      new ApiError(409, { detail: 'Booking is not flagged', code: 'NOT_FLAGGED', request_id: 'r' }),
    );
    setup();
    await u.click(await screen.findByRole('button', { name: 'Resolve' }));
    await u.type(screen.getByRole('textbox'), 'Voided');
    await u.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(await screen.findByText('Booking is not flagged')).toBeInTheDocument();
    await waitFor(() => expect(api.unfulfilled).toHaveBeenCalledTimes(2));
  });

  it('loads more pages', async () => {
    const u = userEvent.setup();
    api.unfulfilled
      .mockResolvedValueOnce(page([booking(1)], true))
      .mockResolvedValueOnce(page([booking(2)], false, 2));
    setup();
    await u.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByText(/court taken 2/)).toBeInTheDocument();
    expect(api.unfulfilled).toHaveBeenLastCalledWith(2);
  });

  it('has no Resolve button without BOOKING:CancelAny', async () => {
    api.unfulfilled.mockResolvedValue(page([booking(1)]));
    setup(['BOOKING:ReadAny']);
    await screen.findByText(/court taken 1/);
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    api.unfulfilled.mockResolvedValue(page([]));
    setup();
    expect(
      await screen.findByText('Nothing to resolve. Every paid booking has its court.'),
    ).toBeInTheDocument();
  });
});
