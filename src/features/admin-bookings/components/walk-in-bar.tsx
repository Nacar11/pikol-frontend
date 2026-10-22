import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTimeRange } from '@/lib/manila';
import { formatPeso } from '@/lib/money';

type Props = {
  courtName: string;
  /** Server ISO string of the first selected hour. */
  startsAt: string;
  hours: number;
  subtotal: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  pending: boolean;
};

/** The walk-in selection summary and the one way to act on it. */
export function WalkInBar({
  courtName,
  startsAt,
  hours,
  subtotal,
  notes,
  onNotesChange,
  onSubmit,
  pending,
}: Props) {
  const endsAt = new Date(Date.parse(startsAt) + hours * 3_600_000).toISOString();
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface p-3 shadow-sm">
      <p className="text-sm">
        {courtName} · {formatTimeRange(startsAt, endsAt)} · {hours} {hours === 1 ? 'hour' : 'hours'}{' '}
        · {formatPeso(subtotal)}
      </p>
      <Input
        aria-label="Notes (optional)"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="w-full sm:w-64"
      />
      <Button onClick={onSubmit} loading={pending}>
        {pending ? 'Booking…' : 'Book walk-in'}
      </Button>
    </div>
  );
}
