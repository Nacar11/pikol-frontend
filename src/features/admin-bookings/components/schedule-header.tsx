import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, formatDayParts, isoWeek, manilaToday } from '@/lib/manila';

/** Breadcrumb, the Manila day as the page title, and the day controls. "New
 * booking" is the screen's one primary action. */
export function ScheduleHeader({
  venueName,
  date,
  onDateChange,
  onNewBooking,
}: {
  venueName: string | null;
  date: string;
  onDateChange: (day: string) => void;
  /** Absent when the caller cannot book walk-ins. */
  onNewBooking?: () => void;
}) {
  const { title } = formatDayParts(date);
  const { year, week } = isoWeek(date);
  const isToday = date === manilaToday();
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Schedule{venueName ? ` / ${venueName}` : ''}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {title}
          <span className="mt-1 block whitespace-nowrap text-sm font-normal tabular-nums tracking-normal text-muted-foreground sm:ml-3 sm:mt-0 sm:inline sm:align-middle">
            {year} · Week {week}
          </span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => onDateChange(manilaToday())} disabled={isToday}>
          Today
        </Button>
        <div className="flex">
          <Button
            variant="secondary"
            aria-label="Previous day"
            className="rounded-r-none px-3"
            onClick={() => onDateChange(addDays(date, -1))}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            variant="secondary"
            aria-label="Next day"
            className="-ml-px rounded-l-none px-3"
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
        {onNewBooking && (
          <Button onClick={onNewBooking}>
            <Plus aria-hidden className="size-4" />
            New booking
          </Button>
        )}
      </div>
    </header>
  );
}
