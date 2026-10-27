import { Button } from '@/components/ui/button';
import { formatDayParts, formatHour } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { byDay, summarize, type Pick } from '../picks';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The black bar: what Pay now will hold, grouped by day. */
export function PickBar({
  picks,
  feePercent,
  paying,
  onPay,
}: {
  picks: Pick[];
  feePercent: string;
  paying: boolean;
  onPay: () => void;
}) {
  if (picks.length === 0) return null;
  const s = summarize(picks, feePercent);
  return (
    <section
      aria-label="Your picks"
      className="fixed inset-x-0 bottom-0 z-20 bg-primary text-primary-foreground"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">
            {`${plural(s.hours, 'hour')} · ${plural(s.courts, 'court')} · ${formatPeso(s.subtotal)} + ${formatPeso(s.fee)} fee`}
          </p>
          <ul className="max-h-20 space-y-0.5 overflow-y-auto text-xs opacity-80">
            {byDay(picks).map((d) => (
              <li key={d.day}>
                <span>{formatDayParts(d.day).title}</span>
                {': '}
                {d.picks.map((p) => `${p.court_name} ${formatHour(p.starts_at)}`).join(', ')}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="secondary"
          onClick={onPay}
          loading={paying}
          className="shrink-0 text-foreground"
        >
          {paying ? 'Holding your hours…' : 'Pay now'}
        </Button>
      </div>
    </section>
  );
}
