import { Button } from '@/components/ui/button';
import { formatHour } from '@/lib/manila';
import { formatPeso } from '@/lib/money';

type Props = {
  courtName: string;
  /** Server ISO string of the first selected hour. */
  startsAt: string;
  hours: number;
  subtotal: number;
  onSubmit: () => void;
  pending: boolean;
};

/** The selection summary and the one way to act on it. The price is the sum
 * of the grid cells; the server adds the fee and states the total. */
export function HoldBar({ courtName, startsAt, hours, subtotal, onSubmit, pending }: Props) {
  const endsAt = new Date(Date.parse(startsAt) + hours * 3_600_000).toISOString();
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface p-3 shadow-sm">
      <p className="text-sm">
        {courtName} · {formatHour(startsAt)} – {formatHour(endsAt)} · {hours}{' '}
        {hours === 1 ? 'hour' : 'hours'} · {formatPeso(subtotal)} + booking fee
      </p>
      <Button onClick={onSubmit} loading={pending}>
        {pending ? 'Holding…' : 'Hold these hours'}
      </Button>
    </div>
  );
}
