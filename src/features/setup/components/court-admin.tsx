'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { Pill } from '@/components/ui/pill';
import { StaffGate, VenueRequired } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { formatPeso } from '@/lib/money';
import {
  useAdminCourts,
  useCourtSummaries,
  useCreateCourt,
  useReorderCourts,
  useUpdateCourt,
} from '../hooks/use-setup';
import type { Court, CourtSummary } from '../schemas';
import { AddCard, SetupCard } from './setup-card';

const DAY_HOURS = 24;

const ARROW =
  'inline-flex size-11 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-8';

export function CourtAdmin() {
  return (
    <StaffGate permission="COURT:Manage">
      <VenueRequired>{(venueId) => <VenueCourts venueId={venueId} />}</VenueRequired>
    </StaffGate>
  );
}

function VenueCourts({ venueId }: { venueId: number }) {
  const { data, error } = useAdminCourts(venueId);
  const summaries = useCourtSummaries(venueId);
  const create = useCreateCourt(venueId);
  const update = useUpdateCourt(venueId);
  const reorder = useReorderCourts(venueId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const courts = [...(data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const active = courts.filter((c) => c.is_active);
  const busy = update.isPending || reorder.isPending;

  function move(index: number, by: -1 | 1) {
    const next = [...courts];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    reorder.mutate(
      next
        .map((c, i) => ({ id: c.id, sort_order: i + 1, was: c.sort_order }))
        .filter((m) => m.sort_order !== m.was)
        .map(({ id, sort_order }) => ({ id, sort_order })),
    );
  }

  return (
    <section className="space-y-8">
      <PageHeader
        section="Setup"
        title="Courts"
        description={`${data ? `${active.length} active · ` : ''}Card order is the column order on the schedule`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add court
          </Button>
        }
      />
      {[create, update, reorder].map(
        (m, i) =>
          m.isError && (
            <Alert key={i} tone="error">
              {errorMessage(m.error)}
            </Alert>
          ),
      )}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {courts.map((c, i) => (
            <SetupCard
              key={c.id}
              head={
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'text-5xl font-semibold tabular-nums leading-none tracking-tight',
                        !c.is_active && 'text-muted-foreground',
                      )}
                    >
                      {c.is_active ? String(active.indexOf(c) + 1).padStart(2, '0') : '—'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Pill tone={c.is_active ? 'solid' : 'dashed'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Pill>
                      <div className="flex">
                        <button
                          type="button"
                          aria-label={`Move ${c.name} earlier`}
                          disabled={i === 0 || busy}
                          onClick={() => move(i, -1)}
                          className={cn(ARROW, 'rounded-l')}
                        >
                          <ChevronLeft aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${c.name} later`}
                          disabled={i === courts.length - 1 || busy}
                          onClick={() => move(i, 1)}
                          className={cn(ARROW, '-ml-px rounded-r')}
                        >
                          <ChevronRight aria-hidden className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {editingId === c.id ? (
                    <RenameForm
                      court={c}
                      pending={update.isPending}
                      onSave={(name) =>
                        update.mutate(
                          { id: c.id, body: { name } },
                          { onSuccess: () => setEditingId(null) },
                        )
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <h2
                      className="truncate text-xl font-semibold tracking-tight"
                      data-testid="court-name"
                    >
                      {c.name}
                    </h2>
                  )}
                </>
              }
              stats={courtStats(summaries.data?.find((s) => s.court_id === c.id))}
              actions={
                <>
                  <Link
                    href={`/staff/courts/${c.id}/pricing`}
                    aria-label={`Prices for ${c.name}`}
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  >
                    Prices
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Rename ${c.name}`}
                    disabled={editingId === c.id}
                    onClick={() => setEditingId(c.id)}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`${c.is_active ? 'Deactivate' : 'Activate'} ${c.name}`}
                    onClick={() => update.mutate({ id: c.id, body: { is_active: !c.is_active } })}
                  >
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </>
              }
            />
          ))}
          <AddCard
            title="Add court"
            hint={`Appears as column ${active.length + 1} on the schedule`}
            open={adding}
            onOpen={() => setAdding(true)}
          >
            <NewCourtForm
              pending={create.isPending}
              hint={`Appears as column ${active.length + 1} on the schedule`}
              onCancel={() => setAdding(false)}
              onCreate={(name) =>
                create.mutate(
                  { name, sort_order: Math.max(0, ...courts.map((c) => c.sort_order)) + 1 },
                  { onSuccess: () => setAdding(false) },
                )
              }
            />
          </AddCard>
        </ul>
      )}
    </section>
  );
}

function courtStats(summary: CourtSummary | undefined) {
  const rate = summary?.rate_centavos ?? null;
  const booked = summary?.booked_hours ?? null;
  return [
    {
      label: 'Rate now',
      value:
        rate === null ? (
          '—'
        ) : (
          <>
            {formatPeso(rate)}
            <span className="text-sm font-normal text-muted-foreground"> / hr</span>
          </>
        ),
    },
    {
      label: 'Booked today',
      value: booked === null ? '—' : `${booked} h`,
      meter: booked === null ? undefined : booked / DAY_HOURS,
    },
  ];
}

function RenameForm({
  court,
  pending,
  onSave,
  onCancel,
}: {
  court: Court;
  pending: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(court.name);
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
    >
      <Input
        aria-label={`${court.name} name`}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="min-w-0 flex-1"
      />
      <Button type="submit" loading={pending} disabled={!name.trim()}>
        Save
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

function NewCourtForm({
  pending,
  hint,
  onCreate,
  onCancel,
}: {
  pending: boolean;
  hint: string;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name.trim());
      }}
    >
      <Label htmlFor="court-name">Name</Label>
      <Input
        id="court-name"
        autoFocus
        placeholder="e.g. Court 5"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      />
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} disabled={!name.trim()}>
          Create court
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
