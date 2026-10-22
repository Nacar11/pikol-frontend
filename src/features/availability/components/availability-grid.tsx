import { cn } from '@/lib/cn';
import { formatHour } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import type { Availability, GridSlot, GridStatus } from '../schemas';
import type { Selection } from '../selection';

type Props = {
  data: Availability;
  selection: Selection | null;
  /** Without it the grid is read-only: no cell is a button. */
  onCellTap?: (courtId: number, index: number) => void;
  /** Staff also open `PAST` cells (free, but too soon for a player). */
  selectable?: (status: GridStatus) => boolean;
};

const CELL = 'flex h-11 w-full items-center justify-center text-sm';

/** Purely presentational: hours down, courts across. Selection is rendered,
 * never decided, here. */
export function AvailabilityGrid({ data, selection, onCellTap, selectable }: Props) {
  const first = data.courts[0];
  if (!first) {
    return <p className="text-sm text-muted-foreground">This venue has no courts yet.</p>;
  }
  return (
    <div className="max-h-[70vh] overflow-auto rounded border border-border bg-surface">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 w-16 border-b border-border bg-surface"
            />
            {data.courts.map((c) => (
              <th
                key={c.court_id}
                scope="col"
                className="sticky top-0 z-10 min-w-24 border-b border-border bg-surface px-2 py-2 text-sm font-medium"
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {first.slots.map((slot, i) => (
            <tr key={slot.starts_at} data-testid="hour-row">
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-border bg-surface px-2 text-right text-xs font-normal text-muted-foreground"
              >
                {formatHour(slot.starts_at)}
              </th>
              {data.courts.map((court) => {
                const s = court.slots[i];
                return (
                  <td key={court.court_id} className="border-b border-border p-0.5">
                    {s && (
                      <Cell
                        court={court.name}
                        slot={s}
                        selected={
                          selection?.court_id === court.court_id &&
                          i >= selection.start &&
                          i <= selection.end
                        }
                        openPast={selectable?.('PAST') ?? false}
                        onTap={onCellTap && (() => onCellTap(court.court_id, i))}
                      />
                    )}
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

function Cell({
  court,
  slot,
  selected,
  openPast,
  onTap,
}: {
  court: string;
  slot: GridSlot;
  selected: boolean;
  openPast: boolean;
  onTap?: () => void;
}) {
  const where = `${court}, ${formatHour(slot.starts_at)}`;

  if (slot.status === 'BOOKED' || slot.status === 'CLOSED') {
    const label = slot.status === 'BOOKED' ? 'Booked' : 'Closed';
    return (
      <div
        role="img"
        aria-label={`${where}, ${label.toLowerCase()}`}
        className={cn(CELL, 'rounded bg-border text-xs text-muted-foreground')}
      >
        {label}
      </div>
    );
  }
  if (slot.status === 'PAST' && !openPast) {
    return (
      <div
        role="img"
        aria-label={`${where}, past`}
        className={cn(CELL, 'rounded bg-muted/50 text-muted-foreground')}
      />
    );
  }

  const price = formatPeso(slot.price_centavos);
  const label = `${where}, ${selected ? 'selected' : 'available'}, ${price}`;
  const style = cn(
    CELL,
    'rounded border font-medium',
    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
  );
  if (!onTap) {
    return (
      <div role="img" aria-label={label} className={style}>
        {price}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onTap}
      className={cn(style, 'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {price}
    </button>
  );
}
