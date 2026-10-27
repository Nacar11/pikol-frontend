import type { Availability, GridStatus, Selection } from '@/features/availability';

/** Staff may also pick `PAST`: free but too soon for a player, which is the
 * walk-in-now case. */
export const staffSelectable = (s: GridStatus): boolean => s === 'AVAILABLE' || s === 'PAST';

/** "New booking": the first free hour at or after `fromHour`, trying courts
 * in display order — the first court first. */
export function nextOpen(grid: Availability, fromHour: number): Selection | null {
  for (const court of grid.courts) {
    const index = court.slots.findIndex((s, i) => i >= fromHour && staffSelectable(s.status));
    if (index !== -1) return { court_id: court.court_id, start: index, end: index };
  }
  return null;
}
