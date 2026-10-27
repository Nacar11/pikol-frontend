'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
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
      <div className="space-y-6">
        {PERMISSION_SECTIONS.map((section, n) => {
          const on = section.codes.filter(({ code }) => checkboxState(code, ctx).checked).length;
          return (
            <fieldset key={section.title} className="space-y-3">
              <legend className="sr-only">{section.title}</legend>
              <div aria-hidden className="flex items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {String(n + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {section.title}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {on} of {section.codes.length}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {section.codes.map(({ code, label }) => {
                  const state = checkboxState(code, ctx);
                  const id = `perm-${group.id}-${code}`;
                  return (
                    <li key={code}>
                      <label
                        htmlFor={id}
                        className={cn(
                          'flex min-h-12 items-center gap-3 rounded border px-3 py-2 text-sm transition-colors duration-150',
                          'focus-within:ring-2 focus-within:ring-ring',
                          state.checked ? 'border-foreground bg-muted' : 'border-border',
                          state.disabled
                            ? 'cursor-not-allowed text-muted-foreground'
                            : 'cursor-pointer hover:border-input hover:bg-muted/60',
                          state.checked && !state.disabled && 'font-medium',
                        )}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={state.checked}
                          disabled={state.disabled}
                          onChange={() => toggle(code)}
                          className="size-4 shrink-0 accent-foreground focus-visible:ring-0"
                        />
                        <span className="flex-1">{label}</span>
                        {/* A read-only group says why once, above — not on every tile. */}
                        {state.reason && !(readOnly && !ownerOnly.has(code)) && (
                          <span className="shrink-0 text-right text-xs">{state.reason}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
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
