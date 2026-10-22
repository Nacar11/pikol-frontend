'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/page-loading';
import { StaffGate } from '@/features/staff';
import { errorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/manila';
import { useParameters, useUpdateParameter } from '../hooks/use-parameters';
import type { Parameter } from '../schemas';

export function ParameterTable() {
  return (
    <StaffGate permission="PARAMETER:Manage">
      <Parameters />
    </StaffGate>
  );
}

function Parameters() {
  const { data, error } = useParameters();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Parameters</h1>
      <p className="text-sm text-muted-foreground">
        Changes apply within a minute and affect new bookings only — prices already charged never
        change.
      </p>
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="space-y-2">
          {data.map((p) => (
            <ParameterRow key={p.key} parameter={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ParameterRow({ parameter }: { parameter: Parameter }) {
  const [draft, setDraft] = useState(parameter.value);
  const save = useUpdateParameter(parameter.key, (row) => setDraft(row.value));
  const dirty = draft !== parameter.value;

  return (
    <li className="space-y-2 rounded border border-border bg-surface p-3">
      <div>
        <p className="font-mono text-sm font-medium">{parameter.key}</p>
        <p className="text-sm text-muted-foreground">{parameter.description}</p>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
      >
        <span className="text-sm">
          Current: <strong>{parameter.value}</strong>
        </span>
        <Editor parameter={parameter} draft={draft} onChange={setDraft} />
        <Button
          type="submit"
          size="sm"
          loading={save.isPending}
          disabled={!dirty || draft.trim() === ''}
          aria-label={`Save ${parameter.key}`}
        >
          Save
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Updated {formatDateTime(parameter.updated_at)}
      </p>
      {save.isError && <Alert tone="error">{errorMessage(save.error)}</Alert>}
    </li>
  );
}

function Editor({
  parameter,
  draft,
  onChange,
}: {
  parameter: Parameter;
  draft: string;
  onChange: (v: string) => void;
}) {
  if (parameter.value_type === 'bool') {
    return (
      <input
        type="checkbox"
        aria-label={parameter.key}
        checked={draft === 'true'}
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
      />
    );
  }
  const numeric = parameter.value_type === 'int' || parameter.value_type === 'decimal';
  return (
    <Input
      aria-label={parameter.key}
      type={numeric ? 'number' : 'text'}
      step={parameter.value_type === 'decimal' ? 'any' : undefined}
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      className="w-40"
    />
  );
}
