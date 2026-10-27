import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notify } from '@/components/ui/snackbar';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Schedule } from '@/features/admin-bookings';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import type { AdminBooking } from '@/features/admin-bookings';
import { authApi } from '@/features/auth/api';
import { AuthContext } from '@/features/auth/auth-provider';
import { availabilityApi } from '@/features/availability/api';
import type { Availability } from '@/features/availability/schemas';
import { staffApi } from '@/features/staff/api';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/availability/api', () => ({ availabilityApi: { day: vi.fn() } }));
vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: { day: vi.fn(), walkIn: vi.fn(), occupancy: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/schedule',
}));
vi.mock('@/components/ui/snackbar', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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

const onDateChange = vi.fn();

function tree(qc: ReturnType<typeof createQueryClient>, date: string) {
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
      >
        <Schedule date={date} onDateChange={onDateChange} />
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
  vi.mocked(adminBookingsApi.occupancy).mockResolvedValue([]);
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 1, name: 'Riverside', is_master: true, groups: [] },
  ]);
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
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Walk-in booked · PKL-9'));
    expect(screen.queryByRole('button', { name: 'Book walk-in' })).not.toBeInTheDocument();
  });

  it('has no buttons in the grid without BOOKING:CreateWalkIn', async () => {
    setup(['BOOKING:ReadAny']);
    await screen.findByRole('img', { name: 'Court 2, 7 PM, open' });
    expect(screen.queryByRole('button', { name: /Court 2/ })).not.toBeInTheDocument();
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
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Someone just booked that.'));
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
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('That is too far back.'));
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
  it('names the player and a walk-in in the panel, and draws all three on the grid', async () => {
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
    // The panel lists the sessions by start time (closures live on the grid)…
    const list = await screen.findByRole('list', { name: 'Bookings this day' });
    expect(within(list).getByText('Ana Cruz')).toBeInTheDocument();
    expect(within(list).getByText('Walk-in')).toBeInTheDocument();
    expect(within(list).queryByText('Closure')).not.toBeInTheDocument();
    expect(
      within(list)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['/staff/bookings/1', '/staff/bookings/2']);
    // …and the grid draws each as a block, its state from the clock and the
    // payment axis (the grid's own rule, tested in schedule-model).
    expect(
      screen.getByRole('link', { name: /Court 2, 6 PM – 7 PM, Walk-in, awaiting payment/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Court 2, 6 PM – 7 PM, Closure, closed/ }),
    ).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    setup(['BOOKING:ReadAny']);
    expect(await screen.findByText('No bookings on this day.')).toBeInTheDocument();
  });
});

describe('Schedule header', () => {
  it('titles the page with the Manila day, its ISO week and the venue', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: /Friday, 23 October/ }),
    ).toHaveTextContent('2026 · Week 43');
    expect(await screen.findByText('Schedule / Riverside')).toBeInTheDocument();
  });

  it('changes day with the arrow keys, but not while typing', async () => {
    setup();
    await screen.findByRole('heading', { level: 1 });

    await userEvent.keyboard('{ArrowRight}');
    expect(onDateChange).toHaveBeenLastCalledWith('2026-10-24');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onDateChange).toHaveBeenLastCalledWith('2026-10-22');

    onDateChange.mockClear();
    await userEvent.click(await screen.findByRole('button', { name: PAST_CELL }));
    await userEvent.type(screen.getByLabelText('Notes (optional)'), '{ArrowRight}');
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it('"New booking" selects the next open hour and raises the walk-in bar', async () => {
    setup();
    await screen.findByRole('button', { name: PAST_CELL });

    await userEvent.click(screen.getByRole('button', { name: 'New booking' }));

    // Not today, so the day's first free hour: 12 AM on the first court.
    expect(await screen.findByRole('button', { name: 'Book walk-in' })).toBeInTheDocument();
    expect(screen.getByText(/Court 2 · 12 AM – 1 AM · 1 hour/)).toBeInTheDocument();
  });

  it('offers no "New booking" without BOOKING:CreateWalkIn', async () => {
    setup(['BOOKING:ReadAny']);
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(authApi.permissions).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'New booking' })).not.toBeInTheDocument();
  });
});
