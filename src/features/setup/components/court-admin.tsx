'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoading } from '@/components/ui/page-loading';
import { usePermissions } from '@/features/auth';
import { StaffGate, useStaffVenue } from '@/features/staff';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { manilaHourNow, manilaToday } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { DAY_HOURS, bookedHours } from '../booked-hours';
import {
  useAdminCourts,
  useCreateCourt,
  useDayPrices,
  useReorderCourts,
  useUpdateCourt,
  useVenueDayBookings,
} from '../hooks/use-setup';
import type { Court } from '../schemas';

export function CourtAdmin() {
  return (
    <StaffGate permission="COURT:Manage">
      <Courts />
    </StaffGate>
  );
}

function Courts() {
  const { venueId, isPending, error: venueError } = useStaffVenue();
  if (venueId === null) {
    if (venueError) return <Alert tone="error">{errorMessage(venueError)}</Alert>;
    return isPending ? <PageLoading /> : <p className="text-muted-foreground">No venues yet.</p>;
  }
  // Keyed so a venue switch drops the form and edit state.
  return <VenueCourts key={venueId} venueId={venueId} />;
}

function VenueCourts({ venueId }: { venueId: number }) {
  const permissions = usePermissions().data ?? [];
  const [today] = useState(() => manilaToday());
  const { data, error } = useAdminCourts(venueId);
  const day = useVenueDayBookings(venueId, today, permissions.includes('BOOKING:ReadAny'));
  const create = useCreateCourt(venueId);
  const update = useUpdateCourt(venueId);
  const reorder = useReorderCourts(venueId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const courts = [...(data?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const active = courts.filter((c) => c.is_active);
  const booked = day.data ? bookedHours(day.data.data, today) : null;

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
        description={
          data
            ? `${active.length} active · Card order is the column order on the schedule`
            : 'Card order is the column order on the schedule'
        }
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            Add court
          </Button>
        }
      />
      {create.isError && <Alert tone="error">{errorMessage(create.error)}</Alert>}
      {update.isError && <Alert tone="error">{errorMessage(update.error)}</Alert>}
      {reorder.isError && <Alert tone="error">{errorMessage(reorder.error)}</Alert>}
      {!data ? (
        error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : (
          <PageLoading />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {courts.map((c, i) => (
            <CourtCard
              key={c.id}
              court={c}
              position={c.is_active ? active.indexOf(c) + 1 : null}
              today={today}
              canPrice={permissions.includes('PRICE:Manage')}
              booked={booked ? (booked.get(c.id) ?? 0) : null}
              editing={editingId === c.id}
              onEdit={(on) => setEditingId(on ? c.id : null)}
              onRename={(name) =>
                update.mutate({ id: c.id, body: { name } }, { onSuccess: () => setEditingId(null) })
              }
              renaming={update.isPending}
              onToggleActive={() => update.mutate({ id: c.id, body: { is_active: !c.is_active } })}
              busy={update.isPending || reorder.isPending}
              onMove={(by) => move(i, by)}
              first={i === 0}
              last={i === courts.length - 1}
            />
          ))}
          <AddCourtTile
            adding={adding}
            onAdding={setAdding}
            column={active.length + 1}
            pending={create.isPending}
            onCreate={(name) =>
              create.mutate(
                {
                  name,
                  // Appended after every existing court.
                  sort_order: Math.max(0, ...courts.map((c) => c.sort_order)) + 1,
                },
                { onSuccess: () => setAdding(false) },
              )
            }
          />
        </ul>
      )}
    </section>
  );
}

function CourtCard({
  court,
  position,
  today,
  canPrice,
  booked,
  editing,
  onEdit,
  onRename,
  renaming,
  onToggleActive,
  busy,
  onMove,
  first,
  last,
}: {
  court: Court;
  position: number | null;
  today: string;
  canPrice: boolean;
  booked: number | null;
  editing: boolean;
  onEdit: (on: boolean) => void;
  onRename: (name: string) => void;
  renaming: boolean;
  onToggleActive: () => void;
  busy: boolean;
  onMove: (by: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  const prices = useDayPrices(court.id, today, canPrice && court.is_active);
  const rate = prices.data?.find((p) => p.hour === manilaHourNow())?.price_centavos;
  const arrow =
    'inline-flex size-11 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-8';

  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            aria-hidden
            className={cn(
              'text-5xl font-semibold tabular-nums leading-none tracking-tight',
              position === null && 'text-muted-foreground',
            )}
          >
            {position === null ? '—' : String(position).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium',
                court.is_active ? 'bg-muted' : 'border border-dashed border-input',
              )}
            >
              {court.is_active ? 'Active' : 'Inactive'}
            </span>
            <div className="flex">
              <button
                type="button"
                aria-label={`Move ${court.name} earlier`}
                disabled={first || busy}
                onClick={() => onMove(-1)}
                className={cn(arrow, 'rounded-l')}
              >
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${court.name} later`}
                disabled={last || busy}
                onClick={() => onMove(1)}
                className={cn(arrow, '-ml-px rounded-r')}
              >
                <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        </div>
        {editing ? (
          <RenameForm
            court={court}
            pending={renaming}
            onSave={onRename}
            onCancel={() => onEdit(false)}
          />
        ) : (
          <h2 className="truncate text-xl font-semibold tracking-tight" data-testid="court-name">
            {court.name}
          </h2>
        )}
      </div>

      <dl className="grid grid-cols-2 border-y border-border">
        <div className="space-y-1 border-r border-border p-4">
          <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Rate now
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {rate === undefined ? (
              '—'
            ) : (
              <>
                {formatPeso(rate)}
                <span className="text-sm font-normal text-muted-foreground"> / hr</span>
              </>
            )}
          </dd>
        </div>
        <div className="space-y-1 p-4">
          <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Booked today
          </dt>
          <dd className="text-lg font-semibold tabular-nums">
            {booked === null ? '—' : `${booked} h`}
          </dd>
          {booked !== null && (
            <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground"
                style={{ width: `${Math.min(100, (booked / DAY_HOURS) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 p-4">
        <Link
          href={`/staff/courts/${court.id}/pricing`}
          aria-label={`Prices for ${court.name}`}
          className="inline-flex h-8 items-center rounded border border-border bg-surface px-3 text-sm font-medium hover:bg-muted"
        >
          Prices
        </Link>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Rename ${court.name}`}
          disabled={editing}
          onClick={() => onEdit(true)}
        >
          Rename
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          aria-label={`${court.is_active ? 'Deactivate' : 'Activate'} ${court.name}`}
          onClick={onToggleActive}
        >
          {court.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </li>
  );
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
      <Button type="submit" size="md" loading={pending} disabled={!name.trim()}>
        Save
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

function AddCourtTile({
  adding,
  onAdding,
  column,
  pending,
  onCreate,
}: {
  adding: boolean;
  onAdding: (on: boolean) => void;
  column: number;
  pending: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const hint = `Appears as column ${column} on the schedule`;
  return (
    <li className="min-h-64 rounded-lg border border-dashed border-input">
      {adding ? (
        <form
          className="flex h-full flex-col justify-center gap-3 p-5"
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
            onKeyDown={(e) => e.key === 'Escape' && onAdding(false)}
          />
          <p className="text-sm text-muted-foreground">{hint}</p>
          <div className="flex gap-2">
            <Button type="submit" loading={pending} disabled={!name.trim()}>
              Create court
            </Button>
            <Button type="button" variant="ghost" onClick={() => onAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onAdding(true)}
          className="flex size-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg p-5 transition-colors duration-150 hover:bg-muted/60"
        >
          <span
            aria-hidden
            className="inline-flex size-12 items-center justify-center rounded border border-foreground"
          >
            <Plus className="size-5" />
          </span>
          <span className="font-semibold">Add court</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
        </button>
      )}
    </li>
  );
}
