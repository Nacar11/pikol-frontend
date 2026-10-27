import { describe, expect, it } from 'vitest';
import type { Availability, GridSlot } from '@/features/availability/schemas';
import {
  MAX_HOURS,
  reconcile,
  subtotalCentavos,
  tapCell,
  toHoldRequest,
} from '@/features/availability/selection';

const BASE = Date.UTC(2026, 9, 22, 16, 0, 0);

function grid(statuses: Record<number, GridSlot['status']> = {}): Availability {
  const court = (id: number) => ({
    court_id: id,
    name: `Court ${id}`,
    slots: Array.from({ length: 24 }, (_, i) => ({
      starts_at: new Date(BASE + i * 3_600_000).toISOString(),
      hour: i,
      status: id === 1 ? (statuses[i] ?? ('AVAILABLE' as const)) : ('AVAILABLE' as const),
      price_centavos: 50000 + i * 100,
    })),
  });
  return {
    venue_id: 1,
    date: '2026-10-23',
    convenience_fee_percent: '3.00',
    courts: [court(1), court(2)],
  };
}

describe('tapCell', () => {
  it('leaves the selection unchanged on a non-AVAILABLE cell', () => {
    const sel = { court_id: 1, start: 2, end: 2 };
    expect(tapCell(sel, grid({ 3: 'BOOKED' }), 1, 3)).toBe(sel);
    expect(tapCell(null, grid({ 3: 'PAST' }), 1, 3)).toBeNull();
  });

  it('starts a one-hour selection when there is none', () => {
    expect(tapCell(null, grid(), 1, 5)).toEqual({ court_id: 1, start: 5, end: 5 });
  });

  it('starts a new selection on another court', () => {
    expect(tapCell({ court_id: 1, start: 2, end: 4 }, grid(), 2, 9)).toEqual({
      court_id: 2,
      start: 9,
      end: 9,
    });
  });

  it('clears when the lone selected cell is tapped', () => {
    expect(tapCell({ court_id: 1, start: 5, end: 5 }, grid(), 1, 5)).toBeNull();
  });

  it('extends the end when tapping after start over available cells', () => {
    expect(tapCell({ court_id: 1, start: 5, end: 5 }, grid(), 1, 7)).toEqual({
      court_id: 1,
      start: 5,
      end: 7,
    });
  });

  it('restarts when tapping before start', () => {
    expect(tapCell({ court_id: 1, start: 5, end: 6 }, grid(), 1, 3)).toEqual({
      court_id: 1,
      start: 3,
      end: 3,
    });
  });

  it('restarts when tapping inside the range', () => {
    expect(tapCell({ court_id: 1, start: 5, end: 8 }, grid(), 1, 6)).toEqual({
      court_id: 1,
      start: 6,
      end: 6,
    });
  });

  it('restarts when a gap lies in between', () => {
    expect(tapCell({ court_id: 1, start: 5, end: 5 }, grid({ 6: 'BOOKED' }), 1, 8)).toEqual({
      court_id: 1,
      start: 8,
      end: 8,
    });
  });

  it('allows exactly 12 hours and restarts at 13', () => {
    const start = { court_id: 1, start: 0, end: 0 };
    expect(MAX_HOURS).toBe(12);
    expect(tapCell(start, grid(), 1, 11)).toEqual({ court_id: 1, start: 0, end: 11 });
    expect(tapCell(start, grid(), 1, 12)).toEqual({ court_id: 1, start: 12, end: 12 });
  });
});

describe('reconcile', () => {
  it('drops a selection whose second cell became BOOKED', () => {
    expect(reconcile({ court_id: 1, start: 5, end: 6 }, grid({ 6: 'BOOKED' }))).toBeNull();
  });

  it('keeps an untouched selection', () => {
    const sel = { court_id: 1, start: 5, end: 6 };
    expect(reconcile(sel, grid({ 9: 'BOOKED' }))).toBe(sel);
  });

  it('drops a selection whose court is gone, and passes null through', () => {
    expect(reconcile({ court_id: 99, start: 1, end: 1 }, grid())).toBeNull();
    expect(reconcile(null, grid())).toBeNull();
  });
});

describe('toHoldRequest', () => {
  it('uses the slot starts_at as sent and counts hours inclusively', () => {
    const g = grid();
    expect(toHoldRequest({ court_id: 2, start: 18, end: 19 }, g)).toEqual({
      court_id: 2,
      starts_at: g.courts[1]!.slots[18]!.starts_at,
      hours: 2,
    });
  });
});

describe('subtotalCentavos', () => {
  it('sums the selected cell prices', () => {
    expect(subtotalCentavos({ court_id: 1, start: 1, end: 2 }, grid())).toBe(50100 + 50200);
  });
});

describe('staff selectable predicate', () => {
  const staff = (s: GridSlot['status']) => s === 'AVAILABLE' || s === 'PAST';

  it('selects a PAST cell for staff and ignores it by default', () => {
    expect(tapCell(null, grid({ 3: 'PAST' }), 1, 3, staff)).toEqual({
      court_id: 1,
      start: 3,
      end: 3,
    });
    expect(tapCell(null, grid({ 3: 'PAST' }), 1, 3)).toBeNull();
  });

  it('extends a span across PAST and AVAILABLE for staff only', () => {
    const g = grid({ 3: 'PAST' });
    const sel = { court_id: 1, start: 3, end: 3 };
    expect(tapCell(sel, g, 1, 4, staff)).toEqual({ court_id: 1, start: 3, end: 4 });
    expect(tapCell(sel, g, 1, 4)).toEqual({ court_id: 1, start: 4, end: 4 });
  });

  it('reconcile keeps a PAST span for staff and drops it by default', () => {
    const g = grid({ 3: 'PAST' });
    const sel = { court_id: 1, start: 3, end: 4 };
    expect(reconcile(sel, g, staff)).toEqual(sel);
    expect(reconcile(sel, g)).toBeNull();
  });
});
