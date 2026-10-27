import type { Availability, GridSlot } from '@/features/availability';
import { cn } from '@/lib/cn';
import { formatHourOfDay } from '@/lib/manila';
import { formatPeso } from '@/lib/money';

/** Courts across, Manila hours down. A free hour is a button showing its
 * price; a taken or closed one is hatched and says so (never colour alone). */
export function CourtHourGrid({
  grid,
  isPicked,
  onTap,
}: {
  grid: Availability;
  isPicked: (courtId: number, slot: GridSlot) => boolean;
  onTap: (courtId: number, courtName: string, slot: GridSlot) => void;
}) {
  return (
    <div className="overflow-x-auto rounded border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-16 border-b border-border p-2 text-left font-medium">
              <span className="sr-only">Hour</span>
            </th>
            {grid.courts.map((c) => (
              <th
                key={c.court_id}
                scope="col"
                className="min-w-24 border-b border-l border-border p-2 text-left font-medium"
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 24 }, (_, hour) => (
            <tr key={hour}>
              <th
                scope="row"
                className="whitespace-nowrap p-2 text-left font-normal text-muted-foreground"
              >
                {formatHourOfDay(hour)}
              </th>
              {grid.courts.map((c) => {
                const slot = c.slots[hour];
                if (!slot) return <td key={c.court_id} className="border-l border-border" />;
                const label = `${c.name}, ${formatHourOfDay(hour)}`;
                if (slot.status === 'AVAILABLE') {
                  const picked = isPicked(c.court_id, slot);
                  return (
                    <td key={c.court_id} className="border-l border-t border-border p-1">
                      <button
                        type="button"
                        aria-pressed={picked}
                        aria-label={`${label}, ${formatPeso(slot.price_centavos)}`}
                        onClick={() => onTap(c.court_id, c.name, slot)}
                        className={cn(
                          'h-9 w-full rounded px-2 text-left tabular-nums',
                          picked
                            ? 'bg-primary font-medium text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        {formatPeso(slot.price_centavos)}
                      </button>
                    </td>
                  );
                }
                const closed = slot.status === 'CLOSED';
                const past = slot.status === 'PAST';
                return (
                  <td
                    key={c.court_id}
                    aria-label={`${label}, ${past ? 'past' : closed ? 'closed' : 'taken'}`}
                    className={cn(
                      'border-l border-t border-border p-2 text-xs text-muted-foreground',
                      !past && 'bg-hatch',
                    )}
                  >
                    {past ? '—' : closed ? 'Closed' : 'Taken'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
