'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { DateStrip } from '@/features/availability';
import { errorMessage } from '@/lib/api-error';
import { formatHourOfDay, manilaToday } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useDayPrices } from '../hooks/use-setup';

/** What a player would pay for each hour of a chosen Manila day. Gate it at
 * the page: the route needs PRICE:Manage. */
export function PricePreview({ courtId }: { courtId: number }) {
  const [day, setDay] = useState(() => manilaToday());
  const { data, error } = useDayPrices(courtId, day);
  const rows = [...(data ?? [])].sort((a, b) => a.hour - b.hour);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Preview</h2>
      <DateStrip value={day} onChange={setDay} />
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="divide-y divide-border rounded border border-border bg-surface">
          {rows.map((p) => (
            <li key={p.hour} className="flex justify-between px-3 py-2 text-sm">
              <span>{formatHourOfDay(p.hour)}</span>
              <span className="font-medium">{formatPeso(p.price_centavos)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
