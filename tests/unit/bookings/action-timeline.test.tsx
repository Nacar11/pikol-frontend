import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionEventPageSchema, ActionTimeline, type ActionEvent } from '@/features/bookings';
import { EVENT_LOOK, eventDetail } from '@/features/bookings/action-events';

// 3:02 PM Manila, Wednesday 28 October 2026.
const AT = '2026-10-28T07:02:00Z';

function ev(over: Partial<ActionEvent> = {}): ActionEvent {
  return {
    id: 1,
    type: 'WALK_IN_BOOKED',
    occurred_at: AT,
    actor: { kind: 'STAFF', name: 'Dana Desk' },
    booking_id: 9,
    reference_code: 'PKL-9',
    court_name: 'Court 2',
    data: {},
    derived: false,
    ...over,
  };
}

const STORED = [
  'HOLD_PLACED',
  'WALK_IN_BOOKED',
  'CLOSURE_CREATED',
  'PAYMENT_STARTED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'CONFIRMED',
  'MARKED_PAID',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'VOIDED',
  'FLAGGED',
  'RESOLVED',
  'REOPENED',
] as const;

describe('ActionTimeline', () => {
  it('parses the server envelope, derived types included', () => {
    const page = ActionEventPageSchema.parse({
      data: [ev({ id: null, type: 'PLAY_STARTED', derived: true }), ev()],
      total: 2,
      page: 1,
      limit: 2,
      has_more: false,
    });
    expect(page.data.map((e) => e.type)).toEqual(['PLAY_STARTED', 'WALK_IN_BOOKED']);
  });

  it('gives every stored and derived type a title, a chip word and a tone', () => {
    for (const type of [...STORED, 'PLAY_STARTED', 'HOLD_ENDED'] as const) {
      const look = EVENT_LOOK[type];
      expect(look.title, type).toBeTruthy();
      expect(look.chip, type).toBeTruthy();
      expect(['wait', 'confirmed', 'done', 'bad', 'neutral']).toContain(look.tone);
    }
    expect(EVENT_LOOK.HOLD_PLACED.tone).toBe('wait');
    expect(EVENT_LOOK.CONFIRMED.tone).toBe('confirmed');
    expect(EVENT_LOOK.MARKED_PAID.tone).toBe('done');
    expect(EVENT_LOOK.REFUNDED.tone).toBe('bad');
    expect(EVENT_LOOK.REOPENED.tone).toBe('neutral');
  });

  it('writes one line of detail from the data', () => {
    expect(
      eventDetail(ev({ type: 'MARKED_PAID', data: { method: 'CASH', amount_centavos: 132000 } })),
    ).toBe('₱1,320 · Cash');
    expect(
      eventDetail(
        ev({
          type: 'HOLD_PLACED',
          data: { expires_at: '2026-10-28T07:05:00Z', total_centavos: 50000 },
        }),
      ),
    ).toBe('₱500 · held until 3:05 PM');
    expect(eventDetail(ev({ type: 'CANCELLED', data: { reason: 'Rain' } }))).toBe('Reason: Rain');
    expect(
      eventDetail(ev({ type: 'VOIDED', data: { amount_centavos: 50000, reference: 'v-1' } })),
    ).toBe('₱500 returned · ref v-1');
    expect(eventDetail(ev({ type: 'CONFIRMED', data: { late: true } }))).toBe(
      'Paid after the hold ended; the hours were still free',
    );
    expect(eventDetail(ev({ type: 'COMPLETED' }))).toBeNull();
  });

  it('renders newest first as given, with chip word, tone, actor and Manila time', () => {
    render(
      <ActionTimeline
        showCourt={false}
        events={[
          ev({ id: 2, type: 'CANCELLED', data: { reason: 'Rain' } }),
          ev({ id: 1, type: 'WALK_IN_BOOKED' }),
        ]}
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Action events' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Booking cancelled');
    expect(items[0]).toHaveTextContent('Reason: Rain');
    expect(items[0]).toHaveTextContent('Dana Desk');
    const chip = within(items[0]!).getByText('Cancelled');
    expect(chip.className).toContain('bg-event-bad-soft');
    const time = items[0]!.querySelector('time');
    expect(time).toHaveAttribute('dateTime', AT);
    expect(time).toHaveTextContent('3:02 PM');
    expect(time).toHaveTextContent('Wed 28 Oct');
    expect(items[1]).toHaveTextContent('Walk-in booked');
  });

  it('names the court only when asked, and says System for the server', () => {
    render(
      <ActionTimeline
        showCourt
        events={[ev({ type: 'CONFIRMED', actor: { kind: 'SYSTEM', name: null } })]}
      />,
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('Court 2');
    expect(screen.getByRole('listitem')).toHaveTextContent('System');
  });

  it('says so when there is nothing yet', () => {
    render(<ActionTimeline showCourt={false} events={[]} />);
    expect(screen.getByText('No events yet.')).toBeInTheDocument();
  });
});
