'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import {
  addDays,
  formatDayChip,
  formatDayParts,
  formatWeekRange,
  isoWeek,
  mondayOf,
} from '@/lib/manila';
import { useOccupancy } from '../hooks/use-occupancy';
import type { DayOccupancy } from '../schemas';

const DAYS = 14;

/**
 * Two weeks from the Monday of the selected day's week, each day with a
 * utilisation bar. ‹ › page a week at a time without changing the day; a
 * day chosen outside the window re-anchors it.
 */
export function WeekStrip({
  venueId,
  value,
  onChange,
}: {
  venueId: number;
  value: string;
  onChange: (day: string) => void;
}) {
  const [anchor, setAnchor] = useState(() => mondayOf(value));
  const [seen, setSeen] = useState(value);
  // When the DAY changes (keyboard ← →, "Today") to one outside the window,
  // re-anchor — during render, adjusting state from a prop. Paging alone
  // leaves the day where it is, so it must not snap back.
  if (value !== seen) {
    setSeen(value);
    if (value < anchor || value > addDays(anchor, DAYS - 1)) setAnchor(mondayOf(value));
  }

  const { data } = useOccupancy(venueId, anchor, DAYS);
  const byDay = new Map((data ?? []).map((d) => [d.date, d]));
  const days = Array.from({ length: DAYS }, (_, i) => addDays(anchor, i));
  const weeks = [days.slice(0, 7), days.slice(7)];

  return (
    <div className="flex items-stretch rounded-md border border-border bg-surface">
      <PageButton label="Previous week" onClick={() => setAnchor(addDays(anchor, -7))}>
        <ChevronLeft aria-hidden className="size-4" />
      </PageButton>
      <div role="group" aria-label="Choose a day" className="flex min-w-0 flex-1 overflow-x-auto">
        {weeks.map((week) => (
          <div
            key={week[0]}
            className="flex min-w-[22rem] flex-1 flex-col border-l border-border first:border-l-0"
          >
            <p className="border-b border-border py-1 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Week {isoWeek(week[0]!).week} · {formatWeekRange(week[0]!)}
            </p>
            <div className="flex flex-1">
              {week.map((day) => (
                <Day
                  key={day}
                  day={day}
                  selected={day === value}
                  occupancy={byDay.get(day)}
                  onClick={() => onChange(day)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <PageButton label="Next week" onClick={() => setAnchor(addDays(anchor, 7))}>
        <ChevronRight aria-hidden className="size-4" />
      </PageButton>
    </div>
  );
}

function PageButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 first:border-r last:border-l hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Day({
  day,
  selected,
  occupancy,
  onClick,
}: {
  day: string;
  selected: boolean;
  occupancy: DayOccupancy | undefined;
  onClick: () => void;
}) {
  const { weekday, day: dom } = formatDayParts(day);
  const { weekday: short, date } = formatDayChip(day);
  const ratio =
    occupancy && occupancy.bookable_hours > 0
      ? Math.min(1, occupancy.booked_hours / occupancy.bookable_hours)
      : 0;
  const usage = occupancy
    ? `, ${occupancy.booked_hours} of ${occupancy.bookable_hours} hours booked`
    : '';
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${short} ${date}${usage}`}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-1 border-l border-border px-1 pb-2 pt-1.5 transition-colors duration-150 first:border-l-0',
        selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'text-[11px] font-medium tracking-widest',
          selected ? 'text-primary-foreground/70' : 'text-muted-foreground',
        )}
      >
        {weekday}
      </span>
      <span className="text-xl font-bold tabular-nums leading-none">{dom}</span>
      <span
        aria-hidden
        className={cn('mt-1 h-1 w-3/4 rounded-full', selected ? 'bg-white/30' : 'bg-border')}
      >
        <span
          className={cn('block h-1 rounded-full', selected ? 'bg-white' : 'bg-primary')}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </span>
    </button>
  );
}
