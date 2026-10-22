import { describe, expect, it } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import { staffActions } from '@/features/admin-bookings/staff-actions';

const START = Date.UTC(2026, 9, 23, 10, 0, 0);
const HOUR = 3_600_000;

function b(over: Partial<AdminBooking>): AdminBooking {
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
    starts_at: new Date(START).toISOString(),
    ends_at: new Date(START + HOUR).toISOString(),
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

const ALL = ['BOOKING:MarkPaid', 'BOOKING:SetOutcome', 'BOOKING:CancelAny', 'CLOSURE:Manage'];
const BEFORE = START - HOUR;
const DURING = START + 1000;
const AFTER = START + 3 * HOUR;

describe('staffActions', () => {
  it('allows mark-paid for an unpaid CONFIRMED walk-in', () => {
    const walkIn = b({ type: 'WALK_IN', payment_status: 'UNPAID' });
    expect(staffActions(walkIn, ALL, BEFORE).has('markPaid')).toBe(true);
  });

  it('allows mark-paid for a COMPLETED unpaid walk-in', () => {
    const done = b({ type: 'WALK_IN', payment_status: 'UNPAID', booking_status: 'COMPLETED' });
    expect(staffActions(done, ALL, AFTER).has('markPaid')).toBe(true);
  });

  it('denies mark-paid for paid, non-walk-in, cancelled, or without the permission', () => {
    const unpaid = { type: 'WALK_IN', payment_status: 'UNPAID' } as const;
    expect(
      staffActions(b({ ...unpaid, payment_status: 'PAID' }), ALL, BEFORE).has('markPaid'),
    ).toBe(false);
    expect(
      staffActions(b({ ...unpaid, type: 'PLAYER_BOOKING' }), ALL, BEFORE).has('markPaid'),
    ).toBe(false);
    expect(
      staffActions(b({ ...unpaid, booking_status: 'CANCELLED' }), ALL, BEFORE).has('markPaid'),
    ).toBe(false);
    expect(staffActions(b(unpaid), ['BOOKING:SetOutcome'], BEFORE).has('markPaid')).toBe(false);
  });

  it('denies outcome before the start', () => {
    expect(staffActions(b({}), ALL, BEFORE).has('outcome')).toBe(false);
  });

  it('allows outcome while IN_PROGRESS', () => {
    const live = b({ display_status: 'IN_PROGRESS' });
    expect(staffActions(live, ALL, DURING).has('outcome')).toBe(true);
  });

  it('allows outcome for a CONFIRMED booking after its end', () => {
    expect(staffActions(b({}), ALL, AFTER).has('outcome')).toBe(true);
  });

  it('denies outcome for a closure, a completed booking, or without the permission', () => {
    expect(staffActions(b({ type: 'MAINTENANCE' }), ALL, AFTER).has('outcome')).toBe(false);
    expect(staffActions(b({ booking_status: 'COMPLETED' }), ALL, AFTER).has('outcome')).toBe(false);
    expect(staffActions(b({}), ['BOOKING:CancelAny'], AFTER).has('outcome')).toBe(false);
  });

  it('allows cancel for a CONFIRMED booking and denies it otherwise', () => {
    expect(staffActions(b({}), ALL, BEFORE).has('cancel')).toBe(true);
    expect(staffActions(b({ type: 'MAINTENANCE' }), ALL, BEFORE).has('cancel')).toBe(false);
    expect(staffActions(b({ booking_status: 'CANCELLED' }), ALL, BEFORE).has('cancel')).toBe(false);
    expect(staffActions(b({}), ['BOOKING:MarkPaid'], BEFORE).has('cancel')).toBe(false);
  });

  it('allows reopen for a CONFIRMED closure and denies it otherwise', () => {
    const closure = b({ type: 'MAINTENANCE' });
    expect(staffActions(closure, ALL, BEFORE).has('reopen')).toBe(true);
    expect(staffActions(b({}), ALL, BEFORE).has('reopen')).toBe(false);
    expect(
      staffActions(b({ type: 'MAINTENANCE', booking_status: 'CANCELLED' }), ALL, BEFORE).has(
        'reopen',
      ),
    ).toBe(false);
    expect(staffActions(closure, ['BOOKING:CancelAny'], BEFORE).has('reopen')).toBe(false);
  });

  it('offers nothing for a PENDING player hold', () => {
    const hold = b({
      booking_status: 'PENDING',
      display_status: 'PENDING',
      payment_status: 'UNPAID',
    });
    expect(staffActions(hold, ALL, AFTER).size).toBe(0);
  });
});
