import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import { DayGlance } from '@/features/admin-bookings/components/day-glance';
import { dayKpis, blocksFor } from '@/features/admin-bookings/schedule-model';
import { availabilityApi } from '@/features/availability/api';
import type { Availability } from '@/features/availability';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/availability/api', () => ({ availabilityApi: { day: vi.fn() } }));
vi.mock('@/features/admin-bookings/api', () => ({ adminBookingsApi: { day: vi.fn() } }));

// A day far in the future, so the real clock never makes anything in progress.
const DAY = Date.UTC(2030, 0, 6, 16); // 12 AM Mon 7 Jan 2030, Manila
const at = (hour: number) => new Date(DAY + hour * 3_600_000).toISOString();

const grid: Availability = {
  venue_id: 1,
  date: '2030-01-07',
  convenience_fee_percent: '3.00',
  courts: [1, 2].map((court_id) => ({
    court_id,
    name: `Court ${court_id}`,
    slots: Array.from({ length: 24 }, (_, h) => ({
      starts_at: at(h),
      hour: h,
      status: 'AVAILABLE' as const,
      price_centavos: 50000,
    })),
  })),
};

function b(over: Partial<AdminBooking>): AdminBooking {
  return {
    id: 1,
    reference_code: 'PKL-1',
    court_id: 1,
    venue_id: 1,
    court_name: 'Court 1',
    venue_name: 'Riverside',
    type: 'WALK_IN',
    booking_status: 'CONFIRMED',
    payment_status: 'PAID',
    display_status: 'CONFIRMED',
    starts_at: at(12),
    ends_at: at(13),
    hours: 1,
    slots: [],
    price_centavos: 50000,
    fee_centavos: 0,
    total_centavos: 50000,
    payment_method: 'CASH',
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: at(0),
    player: null,
    created_by_user_id: 1,
    ...over,
  };
}

const DAY_BOOKINGS = [
  // Paid, 2 h.
  b({ id: 1, starts_at: at(18), ends_at: at(20), hours: 2, total_centavos: 100000 }),
  // Unpaid walk-in: counts toward revenue AND awaiting.
  b({ id: 2, starts_at: at(16), ends_at: at(17), payment_status: 'UNPAID' }),
  // A live hold.
  b({
    id: 3,
    type: 'PLAYER_BOOKING',
    booking_status: 'PENDING',
    payment_status: 'UNPAID',
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    starts_at: at(10),
    ends_at: at(11),
    player: { id: 9, first_name: 'Kim', last_name: 'Tan', email: 'k@x.ph' },
  }),
  // A lapsed hold: still a row (cleanup is lazy), worth nothing.
  b({
    id: 4,
    type: 'PLAYER_BOOKING',
    booking_status: 'PENDING',
    payment_status: 'UNPAID',
    expires_at: new Date(Date.now() - 60_000).toISOString(),
    starts_at: at(8),
    ends_at: at(9),
  }),
  // A cancelled booking.
  b({ id: 5, booking_status: 'CANCELLED', starts_at: at(7), ends_at: at(8) }),
  // A 4-hour closure on court 2: not booked, not bookable.
  b({ id: 6, type: 'MAINTENANCE', court_id: 2, starts_at: at(6), ends_at: at(10), hours: 4 }),
];

describe('dayKpis', () => {
  it('counts live sessions, excludes lapsed holds and closures, and shrinks bookable', () => {
    const k = dayKpis(grid, blocksFor(grid, DAY_BOOKINGS, Date.now()));

    expect(k).toEqual({
      bookedHours: 4, // 2 + 1 + 1 — not the lapsed hold, the cancellation, or the closure
      bookableHours: 44, // 2 courts × 24 − 4 closed
      utilisation: 9,
      sessions: 3,
      revenueCentavos: 200000,
      awaitingCentavos: 100000, // the unpaid walk-in and the live hold
      awaitingCount: 2,
    });
  });
});

describe('DayGlance', () => {
  beforeEach(() => {
    vi.mocked(availabilityApi.day).mockResolvedValue(grid);
    vi.mocked(adminBookingsApi.day).mockResolvedValue({
      data: DAY_BOOKINGS,
      total: DAY_BOOKINGS.length,
      page: 1,
      limit: 200,
      has_more: false,
    } as never);
  });

  it('shows the four tiles in whole pesos', async () => {
    renderWithAuth(<DayGlance venueId={1} date="2030-01-07" />, { status: 'authenticated' });

    expect(await screen.findByText('4 h')).toBeInTheDocument();
    expect(screen.getByText('of 44 h bookable')).toBeInTheDocument();
    expect(screen.getByText('9%')).toBeInTheDocument();
    expect(screen.getByText('₱2,000')).toBeInTheDocument();
    expect(screen.getByText('₱1,000')).toBeInTheDocument();
    expect(screen.getByText('2 bookings')).toBeInTheDocument();
  });

  it('lists sessions by start time, keeping cancelled and lapsed ones marked', async () => {
    renderWithAuth(<DayGlance venueId={1} date="2030-01-07" />, { status: 'authenticated' });

    const list = await screen.findByRole('list', { name: 'Bookings this day' });
    const rows = within(list).getAllByRole('link');
    expect(rows.map((r) => r.getAttribute('href'))).toEqual([
      '/staff/bookings/5',
      '/staff/bookings/4',
      '/staff/bookings/3',
      '/staff/bookings/2',
      '/staff/bookings/1',
    ]);
    expect(within(rows[0]!).getByText('Cancelled')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Expired')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Kim Tan')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Awaiting payment')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('Court 1 · 2 h')).toBeInTheDocument();
  });
});
