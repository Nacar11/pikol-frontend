'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { formatHourOfDay } from '@/lib/manila';
import { formatPeso, parsePesos } from '@/lib/money';
import {
  useAdminCourt,
  useCreatePriceRule,
  useDeletePriceRule,
  usePriceRules,
  useUpdatePriceRule,
} from '../hooks/use-setup';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const BAD_AMOUNT = 'Enter an amount like 600 or 600.50.';
const SELECT =
  'h-10 w-full rounded border border-border bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring';

export function PriceRules({ courtId }: { courtId: number }) {
  return (
    <StaffGate permission="PRICE:Manage">
      <Rules courtId={courtId} />
    </StaffGate>
  );
}

function Rules({ courtId }: { courtId: number }) {
  const court = useAdminCourt(courtId);
  const { data, error } = usePriceRules(courtId);
  const create = useCreatePriceRule(courtId);
  const update = useUpdatePriceRule(courtId);
  const remove = useDeletePriceRule(courtId);
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [price, setPrice] = useState('');
  const [priceError, setPriceError] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const centavos = parsePesos(price);
    setPriceError(centavos === null);
    if (centavos === null) return;
    create.mutate(
      {
        // "Any" is the absence of the key, not a sentinel value.
        ...(day !== '' && { day_of_week: Number(day) }),
        ...(hour !== '' && { hour_of_day: Number(hour) }),
        price_centavos: centavos,
      },
      {
        onSuccess: () => {
          setDay('');
          setHour('');
          setPrice('');
        },
      },
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <Link href="/staff/courts" className="text-sm text-muted-foreground hover:underline">
          Back to courts
        </Link>
        <h1 className="text-xl font-semibold">Prices{court.data ? ` · ${court.data.name}` : ''}</h1>
        <p className="text-sm text-muted-foreground">
          The most specific matching rule sets the price. A change applies to future bookings only.
        </p>
      </div>
      <form onSubmit={add} className="grid gap-3 rounded border border-border bg-surface p-3">
        <div className="space-y-1">
          <Label htmlFor="rule-day">Day</Label>
          <select
            id="rule-day"
            className={SELECT}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            <option value="">Any day</option>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rule-hour">Hour</Label>
          <select
            id="rule-hour"
            className={SELECT}
            value={hour}
            onChange={(e) => setHour(e.target.value)}
          >
            <option value="">Any hour</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {formatHourOfDay(h)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rule-price">Price (pesos)</Label>
          <Input
            id="rule-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setPriceError(false);
            }}
          />
          {priceError && <p className="text-sm text-destructive">{BAD_AMOUNT}</p>}
        </div>
        <Button type="submit" loading={create.isPending} disabled={!price.trim()}>
          Add rule
        </Button>
      </form>
      {create.isError && <Alert tone="error">{errorMessage(create.error)}</Alert>}
      {update.isError && <Alert tone="error">{errorMessage(update.error)}</Alert>}
      {remove.isError && <Alert tone="error">{errorMessage(remove.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">No rules yet. The default price applies.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.id} className="rounded border border-border bg-surface p-3">
              {editingId === r.id ? (
                <EditPrice
                  pending={update.isPending}
                  initial={r.price_centavos}
                  onCancel={() => setEditingId(null)}
                  onSave={(price_centavos) =>
                    update.mutate(
                      { id: r.id, price_centavos },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap gap-x-4 font-medium">
                    <span>{r.day_of_week === null ? 'Any day' : DAYS[r.day_of_week]}</span>
                    <span>
                      {r.hour_of_day === null ? 'Any hour' : formatHourOfDay(r.hour_of_day)}
                    </span>
                    <span>{formatPeso(r.price_centavos)}</span>
                  </p>
                  <RuleActions
                    confirming={confirmingId === r.id}
                    pending={remove.isPending}
                    onEdit={() => setEditingId(r.id)}
                    onAskDelete={() => setConfirmingId(r.id)}
                    onCancelDelete={() => setConfirmingId(null)}
                    onDelete={() => remove.mutate(r.id, { onSettled: () => setConfirmingId(null) })}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleActions({
  confirming,
  pending,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  confirming: boolean;
  pending: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={pending} onClick={onDelete}>
          Confirm delete
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancelDelete}>
          Keep
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={onEdit}>
        Edit price
      </Button>
      <Button variant="secondary" size="sm" onClick={onAskDelete}>
        Delete
      </Button>
    </div>
  );
}

function EditPrice({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: number;
  pending: boolean;
  onSave: (centavos: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(initial / 100));
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const centavos = parsePesos(value);
        setInvalid(centavos === null);
        if (centavos !== null) onSave(centavos);
      }}
    >
      <Input
        aria-label="New price (pesos)"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
      />
      {invalid && <p className="text-sm text-destructive">{BAD_AMOUNT}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
