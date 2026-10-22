import { describe, expect, it } from 'vitest';
import { returnOutcome } from '@/features/bookings/return-outcome';
import type { Booking } from '@/features/bookings/schemas';

function b(over: Partial<Booking>): Booking {
  return {
    booking_status: 'PENDING',
    payment_status: 'UNPAID',
    display_status: 'PENDING',
    ...over,
  } as Booking;
}

describe('returnOutcome', () => {
  it('is confirmed for PAID + CONFIRMED or COMPLETED', () => {
    expect(returnOutcome(b({ booking_status: 'CONFIRMED', payment_status: 'PAID' }))).toBe(
      'confirmed',
    );
    expect(returnOutcome(b({ booking_status: 'COMPLETED', payment_status: 'PAID' }))).toBe(
      'confirmed',
    );
  });

  it('is unhoused for PAID + EXPIRED', () => {
    expect(
      returnOutcome(
        b({ booking_status: 'EXPIRED', payment_status: 'PAID', display_status: 'EXPIRED' }),
      ),
    ).toBe('unhoused');
  });

  it('is failed for a FAILED payment', () => {
    expect(returnOutcome(b({ payment_status: 'FAILED' }))).toBe('failed');
  });

  it('is lapsed when the unpaid hold shows EXPIRED', () => {
    expect(returnOutcome(b({ display_status: 'EXPIRED' }))).toBe('lapsed');
  });

  it('is cancelled for CANCELLED', () => {
    expect(returnOutcome(b({ booking_status: 'CANCELLED', display_status: 'CANCELLED' }))).toBe(
      'cancelled',
    );
  });

  it('is pending otherwise, and never confirmed for an unpaid CONFIRMED walk-in', () => {
    expect(returnOutcome(b({}))).toBe('pending');
    expect(returnOutcome(b({ booking_status: 'CONFIRMED', display_status: 'CONFIRMED' }))).toBe(
      'pending',
    );
  });
});
