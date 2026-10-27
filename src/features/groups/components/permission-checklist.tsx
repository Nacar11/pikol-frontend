'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { useGroupMutations } from '../hooks/use-groups';
import { checkboxState, PERMISSION_SECTIONS, sameSet } from '../permission-rules';
import type { Group, Permission } from '../schemas';

/**
 * A group's permissions as plain-English checkboxes. Saves the whole state
 * in one PUT; never optimistic — a 409 (e.g. SELF_LOCKOUT) leaves the form
 * as the user left it, with the server's message.
 */
export function PermissionChecklist({
  group,
  catalogue,
  held,
  isOwner,
  readOnly,
  onDirtyChange,
}: {
  group: Group;
  catalogue: Permission[];
  held: ReadonlySet<string>;
  isOwner: boolean;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const saved = new Set(group.permissions);
  const [draft, setDraft] = useState<Set<string>>(() => new Set(group.permissions));
  const [error, setError] = useState<unknown>(null);
  const { setPermissions } = useGroupMutations();
  const ownerOnly = new Set(catalogue.filter((p) => p.owner_only).map((p) => p.code));
  const dirty = !sameSet(draft, saved);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function toggle(code: string) {
    setError(null);
    setDraft((d) => {
      const next = new Set(d);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function save() {
    setError(null);
    setPermissions.mutate(
      { id: group.id, codes: [...draft] },
      {
        onSuccess: (updated) => {
          setDraft(new Set(updated.permissions));
          toast.success(`Saved permissions for ${updated.name}.`);
        },
        onError: setError,
      },
    );
  }

  const ctx = { draft, saved, held, isOwner, readOnly, ownerOnly };
  return (
    <div className="space-y-4">
      {readOnly && (
        <p className="text-sm text-muted-foreground">
          The owner manages this group. You can see it, not change it.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {PERMISSION_SECTIONS.map((section) => (
          <fieldset
            key={section.title}
            className={`rounded-md border border-border p-4 ${section.title === 'Owner only' ? 'md:col-span-2' : ''}`}
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </legend>
            <ul className="space-y-1">
              {section.codes.map(({ code, label }) => {
                const state = checkboxState(code, ctx);
                const id = `perm-${group.id}-${code}`;
                return (
                  <li key={code}>
                    <label
                      htmlFor={id}
                      className={`flex min-h-10 items-center gap-3 rounded px-1 text-sm ${state.disabled ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted'}`}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={state.checked}
                        disabled={state.disabled}
                        onChange={() => toggle(code)}
                        className="size-4 accent-primary"
                      />
                      <span className="flex-1">{label}</span>
                      {state.reason && <span className="text-xs">{state.reason}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      {error ? <Alert tone="error">{errorMessage(error)}</Alert> : null}
      {!readOnly && (
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="secondary"
            disabled={!dirty || setPermissions.isPending}
            onClick={() => {
              setError(null);
              setDraft(new Set(group.permissions));
            }}
          >
            Discard
          </Button>
          <Button onClick={save} disabled={!dirty} loading={setPermissions.isPending}>
            Save permissions
          </Button>
        </div>
      )}
    </div>
  );
}
