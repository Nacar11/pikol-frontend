import type { Availability, GridCourt } from './schemas';

/** A run of consecutive slots on one court; `start`/`end` are inclusive
 * indexes into that court's 24 slots. */
export type Selection = { court_id: number; start: number; end: number };

export const MAX_HOURS = 12;

function courtOf(grid: Availability, courtId: number): GridCourt | undefined {
  return grid.courts.find((c) => c.court_id === courtId);
}

function allAvailable(court: GridCourt, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (court.slots[i]?.status !== 'AVAILABLE') return false;
  }
  return true;
}

/** Pure tap rules for building a run of consecutive hours on one court. */
export function tapCell(
  sel: Selection | null,
  grid: Availability,
  courtId: number,
  index: number,
): Selection | null {
  const court = courtOf(grid, courtId);
  if (court?.slots[index]?.status !== 'AVAILABLE') return sel;

  const fresh = { court_id: courtId, start: index, end: index };
  if (!sel || sel.court_id !== courtId) return fresh;
  if (sel.start === sel.end && sel.start === index) return null;
  if (
    index > sel.end &&
    index - sel.start + 1 <= MAX_HOURS &&
    allAvailable(court, sel.start, index)
  ) {
    return { ...sel, end: index };
  }
  return fresh;
}

/** Drops a selection that a fresh grid no longer supports. */
export function reconcile(sel: Selection | null, grid: Availability): Selection | null {
  if (!sel) return null;
  const court = courtOf(grid, sel.court_id);
  if (!court || !allAvailable(court, sel.start, sel.end)) return null;
  return sel;
}

/** `starts_at` is the server's own string, unmodified. */
export function toHoldRequest(
  sel: Selection,
  grid: Availability,
): { court_id: number; starts_at: string; hours: number } {
  const slot = courtOf(grid, sel.court_id)?.slots[sel.start];
  if (!slot) throw new Error('Selection does not match the grid');
  return { court_id: sel.court_id, starts_at: slot.starts_at, hours: sel.end - sel.start + 1 };
}

export function subtotalCentavos(sel: Selection, grid: Availability): number {
  const court = courtOf(grid, sel.court_id);
  let total = 0;
  for (let i = sel.start; i <= sel.end; i++) total += court?.slots[i]?.price_centavos ?? 0;
  return total;
}
