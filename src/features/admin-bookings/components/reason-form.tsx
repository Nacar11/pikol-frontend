'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/** A typed reason, required before submit (spec §6.5). */
export function ReasonForm({
  label,
  submitLabel,
  onSubmit,
  pending,
}: {
  label: string;
  submitLabel: string;
  onSubmit: (reason: string) => void;
  pending: boolean;
}) {
  const id = useId();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
      />
      <Button type="submit" variant="secondary" loading={pending} disabled={!trimmed}>
        {submitLabel}
      </Button>
    </form>
  );
}
