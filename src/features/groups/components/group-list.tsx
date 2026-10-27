'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import type { Group } from '../schemas';

/** The groups as a listbox: ↑ ↓ move, Enter or click opens. Opening goes
 * through `onSelect`, which may refuse (unsaved changes). */
export function GroupList({
  groups,
  selectedId,
  onSelect,
  label,
  tagFor,
  titleFor = (g) => g.name,
}: {
  groups: Group[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  label: string;
  tagFor?: (group: Group) => string | null;
  titleFor?: (group: Group) => string;
}) {
  const items = useRef<(HTMLLIElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number, id: number) {
    const move = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (move) {
      e.preventDefault();
      items.current[Math.min(groups.length - 1, Math.max(0, index + move))]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  }

  return (
    <ul
      role="listbox"
      aria-label={label}
      className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface"
    >
      {groups.map((g, i) => {
        const selected = g.id === selectedId;
        const tag = tagFor?.(g);
        return (
          <li
            key={g.id}
            ref={(el) => {
              items.current[i] = el;
            }}
            role="option"
            aria-selected={selected}
            tabIndex={selected || (selectedId === null && i === 0) ? 0 : -1}
            onClick={() => onSelect(g.id)}
            onKeyDown={(e) => onKeyDown(e, i, g.id)}
            className={cn(
              'flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors duration-150',
              selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{titleFor(g)}</span>
              <span
                className={cn(
                  'block text-xs tabular-nums',
                  selected ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
                {g.kind !== 'CUSTOMER' && ` · ${g.permissions.length} permissions`}
              </span>
            </span>
            {tag && (
              <span className="max-w-[7rem] shrink-0 rounded border border-current px-1.5 text-center text-[10px] font-medium uppercase leading-tight tracking-wider opacity-70">
                {tag}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
