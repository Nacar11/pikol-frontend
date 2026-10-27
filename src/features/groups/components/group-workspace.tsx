'use client';

import { useCallback, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/auth';
import { errorMessage } from '@/lib/api-error';
import { usePermissionCatalogue } from '../hooks/use-groups';
import type { Group } from '../schemas';
import { GroupDetail } from './group-detail';
import { GroupList } from './group-list';

/**
 * The master-detail layout both group pages share: the list on the left,
 * the chosen group on the right. Switching away from unsaved permission
 * changes asks first.
 */
export function GroupWorkspace({
  groups,
  listLabel,
  readOnlyFor,
  tagFor,
  titleFor,
  empty,
  selectedId,
  onSelectedIdChange,
}: {
  groups: Group[];
  listLabel: string;
  readOnlyFor: (group: Group) => boolean;
  tagFor?: (group: Group) => string | null;
  titleFor?: (group: Group) => string;
  empty?: React.ReactNode;
  selectedId: number | null;
  onSelectedIdChange: (id: number | null) => void;
}) {
  const { data: permissions } = usePermissions();
  const catalogue = usePermissionCatalogue();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const held = new Set(permissions ?? []);
  const isOwner = held.has('VENUE:Manage'); // owner-only by construction — never a role
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0] ?? null;

  function select(id: number) {
    if (id === selected?.id) return;
    if (dirty) setPending(id);
    else onSelectedIdChange(id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <GroupList
          groups={groups}
          selectedId={selected?.id ?? null}
          onSelect={select}
          label={listLabel}
          tagFor={tagFor}
          titleFor={titleFor}
        />
        {empty}
      </div>
      <div className="min-w-0 space-y-3">
        {pending !== null && (
          <div
            role="alertdialog"
            aria-label="Unsaved changes"
            className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted p-3"
          >
            <span className="flex-1 text-sm">You have unsaved permission changes.</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDirty(false);
                onSelectedIdChange(pending);
                setPending(null);
              }}
            >
              Discard and switch
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Keep editing
            </Button>
          </div>
        )}
        {catalogue.error ? (
          <Alert tone="error">{errorMessage(catalogue.error)}</Alert>
        ) : selected && catalogue.data ? (
          <GroupDetail
            key={selected.id}
            group={selected}
            title={titleFor?.(selected)}
            catalogue={catalogue.data}
            held={held}
            isOwner={isOwner}
            readOnly={readOnlyFor(selected)}
            onDirtyChange={onDirtyChange}
            onDeleted={() => {
              setDirty(false);
              onSelectedIdChange(null);
            }}
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </div>
  );
}
