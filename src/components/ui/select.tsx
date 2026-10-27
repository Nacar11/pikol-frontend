'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Placement = { left: number; width: number; maxHeight: number } & (
  { top: number } | { bottom: number }
);

const GAP = 4;
const EDGE = 8;
const MAX_HEIGHT = 320;
const TYPEAHEAD_MS = 500;
const PAGE = 10;

/**
 * The console's dropdown, replacing the native <select> — whose popup is
 * drawn by the OS and ignores every token. A select-only combobox (WAI-ARIA
 * APG): focus stays on the trigger, the active option is announced through
 * aria-activedescendant, and the list renders in a portal so a scrolling
 * parent (the sidebar) cannot clip it. It flips above the trigger when the
 * space below is short.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  disabled,
  className,
  listClassName,
  minListWidth = 0,
  renderTrigger,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  listClassName?: string;
  minListWidth?: number;
  renderTrigger?: (selected: SelectOption | undefined, open: boolean) => React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const autoId = useId();
  const triggerId = id ?? `select-${autoId}`;
  const listId = `${triggerId}-list`;
  const optionId = (i: number) => `${triggerId}-option-${i}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const enabled = useCallback((i: number) => !!options[i] && !options[i]!.disabled, [options]);

  const step = useCallback(
    (from: number, by: number) => {
      const dir = Math.sign(by) || 1;
      let target = Math.max(0, Math.min(options.length - 1, from + by));
      while (target >= 0 && target < options.length && !enabled(target)) target += dir;
      if (target < 0 || target >= options.length) return from;
      return target;
    },
    [enabled, options.length],
  );

  const first = () => step(-1, 1);
  const last = () => step(options.length, -1);

  function show(at?: number) {
    if (disabled || options.length === 0) return;
    setActive(at ?? (selectedIndex >= 0 ? selectedIndex : first()));
    setOpen(true);
  }

  function hide(refocus = true) {
    setOpen(false);
    setPlacement(null);
    if (refocus) triggerRef.current?.focus();
  }

  function choose(i: number) {
    if (!enabled(i)) return;
    if (options[i]!.value !== value) onChange(options[i]!.value);
    hide();
  }

  /** Type-ahead: letters typed within half a second build one prefix. */
  function match(key: string): number {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > TYPEAHEAD_MS ? key : t.text + key;
    t.at = now;
    const prefix = t.text.toLowerCase();
    const start = open ? active : selectedIndex;
    // A repeated single letter cycles through the matches.
    const from = prefix.length === 1 ? start + 1 : Math.max(start, 0);
    for (let k = 0; k < options.length; k++) {
      const i = (from + k) % options.length;
      if (enabled(i) && options[i]!.label.toLowerCase().startsWith(prefix)) return i;
    }
    return -1;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const i = match(e.key);
        if (i >= 0) show(i);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => step(a, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => step(a, -1));
        break;
      case 'PageDown':
        e.preventDefault();
        setActive((a) => step(a, PAGE));
        break;
      case 'PageUp':
        e.preventDefault();
        setActive((a) => step(a, -PAGE));
        break;
      case 'Home':
        e.preventDefault();
        setActive(first());
        break;
      case 'End':
        e.preventDefault();
        setActive(last());
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Tab':
        // Tab chooses and lets focus move on, as a native select does.
        if (enabled(active) && options[active]!.value !== value) onChange(options[active]!.value);
        hide(false);
        break;
      case 'Escape':
        e.preventDefault();
        hide();
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const i = match(e.key);
          if (i >= 0) setActive(i);
        }
    }
  }

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, minListWidth), vw - EDGE * 2);
    const left = Math.min(Math.max(r.left, EDGE), vw - width - EDGE);
    const wanted = Math.min(listRef.current?.scrollHeight ?? MAX_HEIGHT, MAX_HEIGHT);
    const below = vh - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    setPlacement(
      below >= wanted || below >= above
        ? { left, width, top: r.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) }
        : { left, width, bottom: vh - r.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) },
    );
  }, [minListWidth]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) hide(false);
    };
    // Scrolling the list itself must not re-place it.
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) place();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, place]);

  // Keep the active option in view; jsdom has no scrollIntoView.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, placement]);

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        data-value={value}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        className={cn(
          renderTrigger
            ? 'text-left'
            : [
                'flex h-10 w-full items-center justify-between gap-2 rounded border border-input bg-surface px-3 text-left text-sm',
                'transition-colors duration-150 hover:border-foreground/40',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'aria-[invalid=true]:border-destructive',
                open && 'border-foreground',
              ],
          className,
        )}
      >
        {renderTrigger ? (
          renderTrigger(selected, open)
        ) : (
          <>
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none',
                open && 'rotate-180',
              )}
            />
          </>
        )}
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={ariaLabel ? undefined : triggerId}
            aria-label={ariaLabel}
            tabIndex={-1}
            style={
              placement
                ? { ...placement, position: 'fixed' }
                : // First paint, before measuring: laid out but unseen.
                  {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    visibility: 'hidden',
                    maxHeight: MAX_HEIGHT,
                  }
            }
            className={cn(
              'z-[70] overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-1 text-sm text-foreground shadow-lg',
              'animate-select-in motion-reduce:animate-none',
              listClassName,
            )}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={o.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  // Keep focus on the trigger while clicking.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => enabled(i) && active !== i && setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    'flex min-h-9 cursor-pointer select-none items-center justify-between gap-3 rounded px-2.5 py-1.5',
                    i === active && 'bg-muted',
                    isSelected && 'font-medium',
                    o.disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check aria-hidden className="size-4 shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
