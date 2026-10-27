import { formatDayParts, formatTimeRange, manilaDayOf } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import type { Checkout } from '../schemas';

/** What a checkout covers, court by court under each Manila day, then the
 * fee and total it froze at Pay now. */
export function CheckoutLines({ checkout }: { checkout: Checkout }) {
  const days = [...new Set(checkout.bookings.map((b) => manilaDayOf(b.starts_at)))].sort();
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const title = formatDayParts(day).title;
        return (
          <div key={day} className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {title}
            </p>
            <ul aria-label={title} className="divide-y divide-border">
              {checkout.bookings
                .filter((b) => manilaDayOf(b.starts_at) === day)
                .map((b) => (
                  <li key={b.id} className="flex justify-between gap-4 py-2 text-sm">
                    <span>{`${b.court_name} · ${formatTimeRange(b.starts_at, b.ends_at)}`}</span>
                    <span className="tabular-nums">{formatPeso(b.price_centavos)}</span>
                  </li>
                ))}
            </ul>
          </div>
        );
      })}
      <dl className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between">
          <dt>Convenience fee</dt>
          <dd className="tabular-nums">{formatPeso(checkout.fee_centavos)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPeso(checkout.total_centavos)}</dd>
        </div>
      </dl>
    </div>
  );
}
