'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/page-loading';
import { Pill } from '@/components/ui/pill';
import { SectionLabel } from '@/components/ui/section-label';
import { StaffGate } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { useParameters, useUpdateParameter } from '../hooks/use-parameters';
import type { Parameter } from '../schemas';

type Section = 'money' | 'bookings' | 'accounts' | 'other';

const SECTIONS: { id: Section; title: string }[] = [
  { id: 'money', title: 'Money' },
  { id: 'bookings', title: 'Bookings' },
  { id: 'accounts', title: 'Accounts & housekeeping' },
  { id: 'other', title: 'Other' },
];

/** A readable name and unit for each key the backend defines (spec §4.5).
 * A key not listed here still shows, under Other, by its raw name. */
const KNOWN: Record<string, { title: string; unit?: string; section: Section }> = {
  default_slot_price_centavos: {
    title: 'Default hourly price',
    unit: 'centavos',
    section: 'money',
  },
  convenience_fee_percent: { title: 'Convenience fee', unit: '%', section: 'money' },
  hold_duration_minutes: { title: 'Hold length', unit: 'min', section: 'bookings' },
  min_lead_minutes: { title: 'Minimum lead time', unit: 'min', section: 'bookings' },
  booking_horizon_days: { title: 'Booking horizon', unit: 'days', section: 'bookings' },
  max_active_holds_per_player: {
    title: 'Holds per player',
    unit: 'holds',
    section: 'bookings',
  },
  cancellation_cutoff_minutes: {
    title: 'Cancellation cutoff',
    unit: 'min',
    section: 'bookings',
  },
  staff_backdate_days: { title: 'Staff backdating', unit: 'days', section: 'bookings' },
  invitation_expiry_days: { title: 'Invitation expiry', unit: 'days', section: 'accounts' },
  webhook_payload_retention_days: {
    title: 'Webhook log retention',
    unit: 'days',
    section: 'accounts',
  },
};

export function ParameterTable() {
  return (
    <StaffGate permission="PARAMETER:Manage">
      <Parameters />
    </StaffGate>
  );
}

function Parameters() {
  const { data, error } = useParameters();
  const sections = SECTIONS.map((s) => ({
    ...s,
    rows: (data ?? []).filter((p) => (KNOWN[p.key]?.section ?? 'other') === s.id),
  })).filter((s) => s.rows.length > 0);

  return (
    <section className="space-y-8">
      <PageHeader
        section="Setup"
        title="Parameters"
        description="Changes apply within a minute and affect new bookings only — prices already charged never change."
      />
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        sections.map((s, n) => (
          <section key={s.id} aria-labelledby={`params-${s.id}`} className="space-y-3">
            <SectionLabel
              n={n + 1}
              as="h2"
              id={`params-${s.id}`}
              aside={`${s.rows.length} ${s.rows.length === 1 ? 'setting' : 'settings'}`}
              className="border-b border-border pb-2"
            >
              {s.title}
            </SectionLabel>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {s.rows.map((p) => (
                <ParameterCard key={p.key} parameter={p} />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}

/** The value as people read it: "15 min", "₱500", "On". */
function Shown({ parameter }: { parameter: Parameter }) {
  const known = KNOWN[parameter.key];
  if (parameter.value_type === 'bool') return <>{parameter.value === 'true' ? 'On' : 'Off'}</>;
  if (parameter.key.endsWith('_centavos') && /^\d+$/.test(parameter.value)) {
    return <>{formatPeso(Number(parameter.value))}</>;
  }
  return (
    <>
      <span>{parameter.value}</span>
      {known?.unit && (
        <span className="text-sm font-normal text-muted-foreground"> {known.unit}</span>
      )}
    </>
  );
}

function ParameterCard({ parameter }: { parameter: Parameter }) {
  const [draft, setDraft] = useState(parameter.value);
  const save = useUpdateParameter(parameter.key, (row) => setDraft(row.value));
  const dirty = draft !== parameter.value;
  const known = KNOWN[parameter.key];

  return (
    <li
      className={cn(
        'flex flex-col rounded-lg border bg-surface',
        dirty ? 'border-foreground' : 'border-border',
      )}
    >
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold">{known?.title ?? parameter.key}</h3>
            {known && (
              <p className="truncate font-mono text-xs text-muted-foreground">{parameter.key}</p>
            )}
          </div>
          {dirty && <Pill tone="outline">Unsaved</Pill>}
        </div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          <Shown parameter={parameter} />
        </p>
        <p className="text-sm text-muted-foreground">{parameter.description}</p>
      </div>

      <form
        className="mt-auto flex flex-wrap items-center gap-2 border-t border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
      >
        <Editor parameter={parameter} unit={known?.unit} draft={draft} onChange={setDraft} />
        <Button
          type="submit"
          size="md"
          loading={save.isPending}
          disabled={!dirty || draft.trim() === ''}
          aria-label={`Save ${parameter.key}`}
        >
          Save
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" onClick={() => setDraft(parameter.value)}>
            Reset
          </Button>
        )}
        {save.isError && (
          <div className="w-full">
            <Alert tone="error">{errorMessage(save.error)}</Alert>
          </div>
        )}
      </form>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Updated {formatDateTime(parameter.updated_at)}
      </p>
    </li>
  );
}

function Editor({
  parameter,
  unit,
  draft,
  onChange,
}: {
  parameter: Parameter;
  unit?: string;
  draft: string;
  onChange: (v: string) => void;
}) {
  if (parameter.value_type === 'bool') {
    const on = draft === 'true';
    return (
      <label className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded border border-input px-3 text-sm">
        <input
          type="checkbox"
          aria-label={parameter.key}
          checked={on}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="size-4 accent-foreground"
        />
        {on ? 'On' : 'Off'}
      </label>
    );
  }
  const numeric = parameter.value_type === 'int' || parameter.value_type === 'decimal';
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        aria-label={parameter.key}
        type={numeric ? 'number' : 'text'}
        step={parameter.value_type === 'decimal' ? 'any' : undefined}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className={cn('tabular-nums', unit && 'pr-20')}
      />
      {unit && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        >
          {unit}
        </span>
      )}
    </div>
  );
}
