import type { Checkout } from '@/features/booking';

/** 2026-10-29 10:00 Manila. */
const TEN = '2026-10-29T02:00:00Z';

export function checkoutFixture(over: Partial<Checkout> = {}): Checkout {
  return {
    id: 1,
    reference_code: 'PKL-AB234',
    venue_id: 3,
    venue_name: 'Riverside',
    status: 'PENDING',
    expires_at: '2026-10-28T02:05:00Z',
    price_centavos: 150000,
    fee_centavos: 4500,
    total_centavos: 154500,
    checkout_url: null,
    refund_kind: null,
    bookings: [
      {
        id: 11,
        reference_code: 'PKL-G1111',
        court_id: 7,
        court_name: 'Court 1',
        starts_at: TEN,
        ends_at: '2026-10-29T04:00:00Z',
        hours: 2,
        price_centavos: 100000,
        booking_status: 'PENDING',
      },
      {
        id: 12,
        reference_code: 'PKL-G2222',
        court_id: 8,
        court_name: 'Court 2',
        starts_at: '2026-10-30T10:00:00Z',
        ends_at: '2026-10-30T11:00:00Z',
        hours: 1,
        price_centavos: 50000,
        booking_status: 'PENDING',
      },
    ],
    created_at: '2026-10-28T02:00:00Z',
    ...over,
  };
}
