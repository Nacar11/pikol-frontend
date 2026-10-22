import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Schedule } from '@/features/admin-bookings';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import type { AdminBooking } from '@/features/admin-bookings';
import { authApi } from '@/features/auth/api';
import { AuthContext } from '@/features/auth/auth-provider';
import { availabilityApi } from '@/features/availability/api';
import type { Availability } from '@/features/availability/schemas';
import { catalogApi } from '@/features/catalog/api';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/availability/api', () => ({ availabilityApi: { day: vi.fn() } }));
vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: { day: vi.fn(), walkIn: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/catalog/api', () => ({ catalogApi: { venues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/schedule',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MIDNIGHT = Date.UTC(2026, 9, 22, 16, 0, 0);
const user = { id: 1, venue_id: 1, role: 'VENUE_STAFF' } as never;

function grid(date = '2026-10-23'): Availability {
  return {
    venue_id: 1,
    date,
    courts: [
      {
        court_id: 7,
        name: 'Court 2',
        slots: Array.from({ length: 24 }, (_, i) => ({
          starts_at: new Date(MIDNIGHT + i * 3_600_000).toISOString(),
          hour: i,
          // 6 PM is free but too soon for a player.
          status: i === 18 ? ('PAST' as const) : ('AVAILABLE' as const),
          price_centavos: 60000,
        })),
      },
    ],
  };
}

function booking(over: Partial<AdminBooking>): AdminBooking {
  return {
    id: 1,
    reference_code: 'PKL-1',
    court_id: 7,
    venue_id: 1,
    court_name: 'Court 2',
    venue_name: 'Venue 1',
    type: 'PLAYER_BOOKING',
    booking_status: 'CONFIRMED',
    payment_status: 'PAID',
    display_status: 'CONFIRMED',
    starts_at: new Date(MIDNIGHT + 18 * 3_600_000).toISOString(),
    ends_at: new Date(MIDNIGHT + 19 * 3_600_000).toISOString(),
    hours: 1,
    slots: [],
    price_centavos: 60000,
    fee_centavos: 0,
    total_centavos: 60000,
    payment_method: null,
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: '2026-10-22T00:00:00Z',
    player: null,
    created_by_user_id: 1,
    ...over,
  };
}

function page(rows: unknown[]) {
  return { data: rows, total: rows.length, page: 1, limit: 200, has_more: false };
}

function apiError(status: number, code: string, detail: string) {
  return new ApiError(status, { detail, code, request_id: 'r' });
}

function tree(qc: ReturnType<typeof createQueryClient>, date: string) {
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
      >
        <Schedule date={date} onDateChange={vi.fn()} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function setup(permissions = ['BOOKING:ReadAny', 'BOOKING:CreateWalkIn']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  const qc = createQueryClient();
  const view = render(tree(qc, '2026-10-23'));
  return { qc, view };
}

const PAST_CELL = 'Court 2, 6 PM, available, already started, ₱600';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(availabilityApi.day).mockResolvedValue(grid());
  vi.mocked(adminBookingsApi.day).mockResolvedValue(page([]) as never);
  vi.mocked(catalogApi.venues).mockResolvedValue(page([]) as never);
});

describe('Schedule walk-ins', () => {
  it('books a PAST cell as a walk-in and toasts the reference code', async () => {
    vi.mocked(adminBookingsApi.walkIn).mockResolvedValue(
      booking({ id: 9, reference_code: 'PKL-9', type: 'WALK_IN', payment_status: 'UNPAID' }),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: PAST_CELL }));
    await userEvent.click(screen.getByRole('button', { name: 'Book walk-in' }));
    await waitFor(() =>
      expect(adminBookingsApi.walkIn).toHaveBeenCalledWith({
        court_id: 7,
        starts_at: grid().courts[0]!.slots[18]!.starts_at,
        hours: 1,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Walk-in booked · PKL-9'));
    expect(screen.queryByRole('button', { name: 'Book walk-in' })).not.toBeInTheDocument();
  });

  it('has no buttons in the grid without BOOKING:CreateWalkIn', async () => {
    setup(['BOOKING:ReadAny']);
    await screen.findByLabelText('Court 2, 7 PM, available, ₱600');
    expect(screen.queryByRole('button', { name: /Court 2/ })).not.toBeInTheDocument();
    // The started hour looks exactly as it does for a player.
    expect(screen.getByRole('img', { name: 'Court 2, 6 PM, past' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/6 PM, available/)).not.toBeInTheDocument();
  });

  it('clears the selection on SLOT_UNAVAILABLE and refetches', async () => {
    vi.mocked(adminBookingsApi.walkIn).mockRejectedValue(
      apiError(409, 'SLOT_UNAVAILABLE', 'Someone just booked that.'),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: PAST_CELL }));
    await userEvent.click(screen.getByRole('button', { name: 'Book walk-in' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Someone just booked that.'));
    expect(screen.queryByRole('button', { name: 'Book walk-in' })).not.toBeInTheDocument();
    await waitFor(() => expect(availabilityApi.day).toHaveBeenCalledTimes(2));
  });

  it('keeps the selection on TOO_FAR_BACK', async () => {
    vi.mocked(adminBookingsApi.walkIn).mockRejectedValue(
      apiError(422, 'TOO_FAR_BACK', 'That is too far back.'),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: PAST_CELL }));
    await userEvent.click(screen.getByRole('button', { name: 'Book walk-in' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That is too far back.'));
    expect(screen.getByRole('button', { name: 'Book walk-in' })).toBeInTheDocument();
  });

  it('drops the selection when the date changes', async () => {
    const { qc, view } = setup();
    await userEvent.click(await screen.findByRole('button', { name: PAST_CELL }));
    expect(screen.getByRole('button', { name: 'Book walk-in' })).toBeInTheDocument();
    vi.mocked(availabilityApi.day).mockResolvedValue(grid('2026-10-24'));
    view.rerender(tree(qc, '2026-10-24'));
    await screen.findByLabelText('Court 2, 7 PM, available, ₱600');
    expect(screen.queryByRole('button', { name: 'Book walk-in' })).not.toBeInTheDocument();
  });
});

describe('Schedule day list', () => {
  it('names the player, a walk-in and a closure, and renders IN_PROGRESS', async () => {
    vi.mocked(adminBookingsApi.day).mockResolvedValue(
      page([
        booking({
          id: 1,
          display_status: 'IN_PROGRESS',
          player: { id: 5, first_name: 'Ana', last_name: 'Cruz', email: 'a@x.ph' },
        }),
        booking({ id: 2, type: 'WALK_IN', payment_status: 'UNPAID' }),
        booking({ id: 3, type: 'MAINTENANCE', payment_status: 'UNPAID', total_centavos: 0 }),
      ]) as never,
    );
    setup(['BOOKING:ReadAny']);
    expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    expect(screen.getByText('Closure')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h) => h?.startsWith('/staff/bookings/'));
    expect(hrefs).toEqual(['/staff/bookings/1', '/staff/bookings/2', '/staff/bookings/3']);
  });

  it('shows the empty state', async () => {
    setup(['BOOKING:ReadAny']);
    expect(await screen.findByText('No bookings on this day.')).toBeInTheDocument();
  });
});
