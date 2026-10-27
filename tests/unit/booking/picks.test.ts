import { describe, expect, it } from 'vitest';
import type { Availability } from '@/features/availability';
import {
  byDay,
  dropUnavailable,
  feeCentavos,
  MAX_CHECKOUT_HOURS,
  summarize,
  toItems,
  togglePick,
  type Pick,
} from '@/features/booking';

const H = 3_600_000;
// 2026-10-29 00:00 Manila.
const DAY1 = Date.UTC(2026, 9, 28, 16);
const at = (hour: number, day = DAY1) => new Date(day + hour * H).toISOString();

function pick(court: number, hour: number, over: Partial<Pick> = {}): Pick {
  return {
    court_id: court,
    court_name: `Court ${court}`,
    day: '2026-10-29',
    starts_at: at(hour),
    price_centavos: 50000,
    ...over,
  };
}

describe('togglePick', () => {
  it('adds a pick, then removes it on a second tap', () => {
    const one = togglePick([], pick(1, 10));
    expect(one).toEqual([pick(1, 10)]);
    expect(togglePick(one, pick(1, 10))).toEqual([]);
  });

  it(`ignores a pick past ${MAX_CHECKOUT_HOURS} hours`, () => {
    let picks: Pick[] = [];
    for (let h = 0; h < 24; h++) picks = togglePick(picks, pick(1, h));
    expect(picks).toHaveLength(24);
    expect(togglePick(picks, pick(2, 0))).toBe(picks);
  });
});

describe('toItems', () => {
  it('merges consecutive hours on one court and keeps other courts apart', () => {
    const picks = [pick(1, 12), pick(2, 10), pick(1, 10), pick(1, 11)];
    expect(toItems(picks)).toEqual([
      { court_id: 1, starts_at: at(10), hours: 3 },
      { court_id: 2, starts_at: at(10), hours: 1 },
    ]);
  });

  it('starts a new item after a gap', () => {
    expect(toItems([pick(1, 10), pick(1, 12)])).toEqual([
      { court_id: 1, starts_at: at(10), hours: 1 },
      { court_id: 1, starts_at: at(12), hours: 1 },
    ]);
  });

  it('splits a run longer than 12 hours', () => {
    const picks = Array.from({ length: 13 }, (_, h) => pick(1, h));
    expect(toItems(picks)).toEqual([
      { court_id: 1, starts_at: at(0), hours: 12 },
      { court_id: 1, starts_at: at(12), hours: 1 },
    ]);
  });
});

describe('feeCentavos', () => {
  it('rounds half up, like the server', () => {
    expect(feeCentavos(50000, '3.00')).toBe(1500);
    expect(feeCentavos(16650, '3.00')).toBe(500); // 499.5
    expect(feeCentavos(16649, '3.00')).toBe(499);
    expect(feeCentavos(10000, '2.5')).toBe(250);
    expect(feeCentavos(50000, '0')).toBe(0);
  });
});

describe('summarize', () => {
  it('counts hours and distinct courts across days', () => {
    const picks = [
      pick(1, 10),
      pick(1, 11),
      pick(2, 9, { day: '2026-10-30', starts_at: at(9, DAY1 + 24 * H), price_centavos: 60000 }),
    ];
    expect(summarize(picks, '3.00')).toEqual({
      hours: 3,
      courts: 2,
      subtotal: 160000,
      fee: 4800,
      total: 164800,
    });
  });
});

describe('byDay', () => {
  it('groups picks by day, in day and time order', () => {
    const later = pick(1, 9, { day: '2026-10-30', starts_at: at(9, DAY1 + 24 * H) });
    const groups = byDay([later, pick(2, 11), pick(1, 10)]);
    expect(groups.map((g) => g.day)).toEqual(['2026-10-29', '2026-10-30']);
    expect(groups[0]!.picks.map((p) => p.starts_at)).toEqual([at(10), at(11)]);
  });
});

describe('dropUnavailable', () => {
  it("removes that day's picks that are no longer free, and keeps other days", () => {
    const grid: Availability = {
      venue_id: 1,
      date: '2026-10-29',
      convenience_fee_percent: '3.00',
      courts: [
        {
          court_id: 1,
          name: 'Court 1',
          slots: Array.from({ length: 24 }, (_, h) => ({
            starts_at: at(h),
            hour: h,
            status: h === 10 ? ('BOOKED' as const) : ('AVAILABLE' as const),
            price_centavos: 50000,
          })),
        },
      ],
    };
    const other = pick(1, 10, { day: '2026-10-30', starts_at: at(10, DAY1 + 24 * H) });
    expect(dropUnavailable([pick(1, 10), pick(1, 11), other], grid)).toEqual([pick(1, 11), other]);
  });
});
