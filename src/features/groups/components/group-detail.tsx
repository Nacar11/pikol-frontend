'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api-error';
import { useGroupMutations } from '../hooks/use-groups';
import type { Group, Permission } from '../schemas';
import { CustomerSearch } from './customer-search';
import { MemberPanel } from './member-panel';
import { PermissionChecklist } from './permission-checklist';

type Tab = 'permissions' | 'members';

const KIND_LABEL: Record<Group['kind'], string> = {
  CUSTOMER: 'Customers',
  MASTER: 'Venue master',
  STAFF: 'Staff',
};

/** Why the delete button is off, or null when it may be pressed. */
function deleteBlocked(group: Group, readOnly: boolean): string | null {
  if (group.kind !== 'STAFF') return 'Built-in groups cannot be deleted.';
  if (readOnly) return 'The owner manages this group.';
  if (group.member_count > 0) return 'Move its members out first.';
  return null;
}

export function GroupDetail({
  group,
  title,
  catalogue,
  held,
  isOwner,
  readOnly,
  onDirtyChange,
  onDeleted,
}: {
  group: Group;
  title?: string;
  catalogue: Permission[];
  held: ReadonlySet<string>;
  isOwner: boolean;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onDeleted: () => void;
}) {
  const tabs: Tab[] = group.kind === 'CUSTOMER' ? ['members'] : ['permissions', 'members'];
  const [tab, setTab] = useState<Tab>(tabs[0]!);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const blocked = deleteBlocked(group, readOnly);
  const active = tabs.includes(tab) ? tab : tabs[0]!;
  const grantable = catalogue.filter((p) => !p.owner_only).length;
  const stats: { label: string; value: string }[] = [
    { label: 'Members', value: String(group.member_count) },
    ...(group.kind === 'CUSTOMER'
      ? []
      : [{ label: 'Permissions', value: `${group.permissions.length} of ${grantable}` }]),
    {
      label: 'Type',
      value: readOnly ? `${KIND_LABEL[group.kind]} · read-only` : KIND_LABEL[group.kind],
    },
  ];

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!move) return;
    e.preventDefault();
    const next = (i + move + tabs.length) % tabs.length;
    setTab(tabs[next]!);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      aria-label={title ?? group.name}
      className="rounded-lg border border-border bg-surface"
    >
      <div className="p-5">
        <Heading
          group={group}
          title={title}
          readOnly={readOnly}
          blocked={blocked}
          onDeleted={onDeleted}
        />
      </div>

      <dl
        className={cn(
          'grid border-y border-border',
          stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn('min-w-0 space-y-1 p-3 sm:p-4', i > 0 && 'border-l border-border')}
          >
            <dt className="truncate text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {s.label}
            </dt>
            <dd className="text-base font-semibold tabular-nums sm:text-lg">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div role="tablist" aria-label="Group" className="flex gap-6 border-b border-border px-5">
        {tabs.map((t, i) => {
          const selected = t === active;
          const label =
            t === 'permissions'
              ? `Permissions · ${group.permissions.length}`
              : `Members · ${group.member_count}`;
          return (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${group.id}-${t}`}
              aria-selected={selected}
              aria-controls={`panel-${group.id}-${t}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                '-mb-px min-h-11 border-b-2 text-sm transition-colors duration-150',
                selected
                  ? 'border-primary font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="p-5"
        role="tabpanel"
        id={`panel-${group.id}-${active}`}
        aria-labelledby={`tab-${group.id}-${active}`}
      >
        {active === 'permissions' ? (
          <PermissionChecklist
            // A fresh draft for each group, and after each save.
            key={`${group.id}:${group.permissions.join(',')}`}
            group={group}
            catalogue={catalogue}
            held={held}
            isOwner={isOwner}
            readOnly={readOnly}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          <div className="space-y-6">
            {group.kind === 'CUSTOMER' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Customers can book and pay in the mobile app.
                </p>
                <CustomerSearch group={group} />
              </>
            )}
            <MemberPanel group={group} readOnly={readOnly || group.kind === 'CUSTOMER'} />
          </div>
        )}
      </div>
    </section>
  );
}

function Heading({
  group,
  title,
  readOnly,
  blocked,
  onDeleted,
}: {
  group: Group;
  title?: string;
  readOnly: boolean;
  blocked: string | null;
  onDeleted: () => void;
}) {
  const { rename, remove } = useGroupMutations();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const renamable = !readOnly && group.kind !== 'CUSTOMER';

  if (editing) {
    return (
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          rename.mutate(
            { id: group.id, name: name.trim() },
            { onSuccess: () => setEditing(false), onError: setError },
          );
        }}
      >
        <label htmlFor={`rename-${group.id}`} className="text-sm font-medium">
          Group name
        </label>
        <div className="flex gap-2">
          <Input
            id={`rename-${group.id}`}
            value={name}
            maxLength={64}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Button type="submit" loading={rename.isPending} disabled={!name.trim()}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        {error ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{title ?? group.name}</h2>
        <div className="flex gap-2">
          {renamable && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Rename
            </Button>
          )}
          {group.kind === 'STAFF' && (
            <Button
              variant="secondary"
              size="sm"
              className="text-destructive"
              disabled={blocked !== null}
              title={blocked ?? undefined}
              aria-describedby={blocked ? `delete-why-${group.id}` : undefined}
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      {blocked && group.kind === 'STAFF' && (
        <p id={`delete-why-${group.id}`} className="text-xs text-muted-foreground">
          {blocked}
        </p>
      )}
      {confirming && (
        <div
          role="alertdialog"
          aria-label="Delete group"
          className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3"
        >
          <span className="flex-1 text-sm">Delete {group.name}? This cannot be undone.</span>
          <Button
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(group.id, {
                onSuccess: () => {
                  toast.success(`${group.name} deleted.`);
                  onDeleted();
                },
                onError: (err) => {
                  setConfirming(false);
                  setError(err);
                },
              })
            }
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      )}
      {error ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
    </div>
  );
}
