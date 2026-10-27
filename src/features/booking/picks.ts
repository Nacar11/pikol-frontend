import type { Availability } from '@/features/availability';
import type { CheckoutItem } from './schemas';

/** One court-hour the customer tapped. `starts_at` is the server's string. */
export type Pick = {
  court_id: number;
  court_name: string;
  day: string;
  starts_at: string;
  price_centavos: number;
};

/** The server's caps: 24 hours per payment, 12 per run of one court. */
export const MAX_CHECKOUT_HOURS = 24;
const MAX_RUN = 12;
const HOUR = 3_600_000;

const same = (a: Pick, b: Pick) => a.court_id === b.court_id && a.starts_at === b.starts_at;
const byTime = (a: Pick, b: Pick) => Date.parse(a.starts_at) - Date.parse(b.starts_at);

export function togglePick(picks: Pick[], pick: Pick): Pick[] {
  if (picks.some((p) => same(p, pick))) return picks.filter((p) => !same(p, pick));
  if (picks.length >= MAX_CHECKOUT_HOURS) return picks;
  return [...picks, pick];
}

/** Consecutive hours on one court become one item (one booking group). */
export function toItems(picks: Pick[]): CheckoutItem[] {
  const sorted = [...picks].sort((a, b) => a.court_id - b.court_id || byTime(a, b));
  const items: CheckoutItem[] = [];
  let run: { item: CheckoutItem; court: number; next: number } | null = null;
  for (const p of sorted) {
    const at = Date.parse(p.starts_at);
    if (run && run.court === p.court_id && run.next === at && run.item.hours < MAX_RUN) {
      run.item.hours += 1;
      run.next += HOUR;
      continue;
    }
    const item = { court_id: p.court_id, starts_at: p.starts_at, hours: 1 };
    items.push(item);
    run = { item, court: p.court_id, next: at + HOUR };
  }
  return items;
}

/** round_half_up(subtotal × percent / 100) in whole centavos — the server's
 * own rule, in integer arithmetic on the percent's digits. */
export function feeCentavos(subtotal: number, percent: string): number {
  const [whole = '0', frac = ''] = percent.split('.');
  const scale = 10 ** frac.length;
  const scaled = Number(whole) * scale + Number(frac || '0');
  const denominator = 100 * scale;
  return Math.floor((2 * subtotal * scaled + denominator) / (2 * denominator));
}

export function summarize(
  picks: Pick[],
  percent: string,
): { hours: number; courts: number; subtotal: number; fee: number; total: number } {
  const subtotal = picks.reduce((sum, p) => sum + p.price_centavos, 0);
  const fee = feeCentavos(subtotal, percent);
  return {
    hours: picks.length,
    courts: new Set(picks.map((p) => p.court_id)).size,
    subtotal,
    fee,
    total: subtotal + fee,
  };
}

export function byDay(picks: Pick[]): { day: string; picks: Pick[] }[] {
  const days = [...new Set(picks.map((p) => p.day))].sort();
  return days.map((day) => ({
    day,
    picks: picks
      .filter((p) => p.day === day)
      .sort((a, b) => byTime(a, b) || a.court_id - b.court_id),
  }));
}

/** After a refetch: drop the grid day's picks that are no longer free. */
export function dropUnavailable(picks: Pick[], grid: Availability): Pick[] {
  const free = new Set(
    grid.courts.flatMap((c) =>
      c.slots.filter((s) => s.status === 'AVAILABLE').map((s) => `${c.court_id}@${s.starts_at}`),
    ),
  );
  return picks.filter((p) => p.day !== grid.date || free.has(`${p.court_id}@${p.starts_at}`));
}
