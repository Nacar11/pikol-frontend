import { describe, expect, it } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import {
  blockKind,
  blocksFor,
  courtHours,
  liveStatus,
  nextOpen,
  priceLabel,
} from '@/features/admin-bookings/schedule-model';
import type { Availability } from '@/features/availability';

const DAY = Date.UTC(2026, 9, 22, 16); // 12 AM Fri 23 Oct, Manila
const at = (hour: number) => new Date(DAY + hour * 3_600_000).toISOString();

function grid(
  statuses: Record<number, 'BOOKED' | 'CLOSED' | 'PAST'> = {},
  price = 50000,
): Availability {
  return {
    venue_id: 1,
    date: '2026-10-23',
    courts: [7, 8].map((court_id) => ({
      court_id,
      name: `Court ${court_id}`,
      slots: Array.from({ length: 24 }, (_, h) => ({
        starts_at: at(h),
        hour: h,
        status: court_id === 7 ? (statuses[h] ?? 'AVAILABLE') : 'AVAILABLE',
        price_centavos: price,
      })),
    })),
  };
}

function booking(over: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id: 1,
    reference_code: 'PKL-1',
    court_id: 7,
    venue_id: 1,
    court_name: 'Court 7',
    venue_name: 'Riverside',
    type: 'WALK_IN',
    booking_status: 'CONFIRMED',
    payment_status: 'PAID',
    display_status: 'CONFIRMED',
    starts_at: at(18),
    ends_at: at(20),
    hours: 2,
    slots: [],
    price_centavos: 100000,
    fee_centavos: 0,
    total_centavos: 100000,
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

describe('liveStatus', () => {
  it('is IN_PROGRESS from the first minute to the last, CONFIRMED either side', () => {
    const b = booking();
    expect(liveStatus(b, Date.parse(at(18)) - 1)).toBe('CONFIRMED');
    expect(liveStatus(b, Date.parse(at(18)))).toBe('IN_PROGRESS');
    expect(liveStatus(b, Date.parse(at(20)) - 1)).toBe('IN_PROGRESS');
    expect(liveStatus(b, Date.parse(at(20)))).toBe('CONFIRMED');
  });

  it('reads a lapsed hold as EXPIRED — the PENDING trap', () => {
    const hold = booking({ booking_status: 'PENDING', expires_at: at(10) });
    expect(liveStatus(hold, Date.parse(at(10)) - 1)).toBe('PENDING');
    expect(liveStatus(hold, Date.parse(at(10)))).toBe('EXPIRED');
  });
});

describe('blockKind', () => {
  const now = Date.parse(at(9));

  it('shows unpaid live bookings as awaiting payment, paid ones as confirmed', () => {
    expect(blockKind(booking({ payment_status: 'UNPAID' }), now)).toBe('AWAITING_PAYMENT');
    expect(
      blockKind(
        booking({ booking_status: 'PENDING', payment_status: 'UNPAID', expires_at: at(10) }),
        now,
      ),
    ).toBe('AWAITING_PAYMENT');
    expect(blockKind(booking(), now)).toBe('CONFIRMED');
  });

  it('drops bookings that no longer hold the court', () => {
    expect(blockKind(booking({ booking_status: 'CANCELLED' }), now)).toBeNull();
    expect(blockKind(booking({ booking_status: 'PENDING', expires_at: at(8) }), now)).toBeNull();
  });

  it('draws closures as closed whatever their status axes say', () => {
    expect(blockKind(booking({ type: 'MAINTENANCE', payment_status: 'UNPAID' }), now)).toBe(
      'CLOSED',
    );
  });
});

describe('blocksFor and courtHours', () => {
  it('makes one block per booking, spanning its hours', () => {
    const [block] = blocksFor(grid(), [booking()], Date.parse(at(9)));
    expect(block).toMatchObject({ courtId: 7, start: 18, span: 2, kind: 'CONFIRMED' });
  });

  it('clips a session that runs past midnight to this day', () => {
    const late = booking({ starts_at: at(23), ends_at: at(25), hours: 2 });
    expect(blocksFor(grid(), [late], 0)[0]).toMatchObject({ start: 23, span: 1 });
  });

  it('counts sessions as booked and closures as closed, per court', () => {
    const blocks = blocksFor(
      grid(),
      [
        booking(),
        booking({ id: 2, type: 'MAINTENANCE', starts_at: at(6), ends_at: at(9), hours: 3 }),
      ],
      0,
    );
    expect(courtHours(blocks, 7)).toEqual({ booked: 2, closed: 3 });
    expect(courtHours(blocks, 8)).toEqual({ booked: 0, closed: 0 });
  });
});

describe('nextOpen and priceLabel', () => {
  it('finds the first free hour from the given hour, first court first', () => {
    expect(nextOpen(grid({ 9: 'BOOKED', 10: 'BOOKED' }), 9)).toEqual({
      court_id: 7,
      start: 11,
      end: 11,
    });
    // A started-but-free hour counts: that is the walk-in-now case.
    expect(nextOpen(grid({ 9: 'PAST' }), 9)).toEqual({ court_id: 7, start: 9, end: 9 });
  });

  it('labels a flat price plainly and a varying one with "from"', () => {
    const flat = grid().courts[0]!;
    expect(priceLabel(flat)).toBe('₱500 / hr');
    const varied = {
      ...flat,
      slots: flat.slots.map((s, i) => ({ ...s, price_centavos: i > 17 ? 60000 : 40000 })),
    };
    expect(priceLabel(varied)).toBe('from ₱400 / hr');
  });
});
