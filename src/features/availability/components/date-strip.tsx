import { cn } from '@/lib/cn';
import { addDays, formatDayChip, manilaToday } from '@/lib/manila';

/** `days` Manila calendar days beginning `start` days from today (negative
 * starts in the past). */
export function DateStrip({
  value,
  onChange,
  days = 14,
  start = 0,
}: {
  value: string;
  onChange: (day: string) => void;
  days?: number;
  start?: number;
}) {
  const today = manilaToday();
  return (
    <div role="group" aria-label="Choose a day" className="flex gap-2 overflow-x-auto pb-1">
      {Array.from({ length: days }, (_, i) => {
        const day = addDays(today, start + i);
        const { weekday, date } = formatDayChip(day);
        const selected = day === value;
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            aria-label={`${weekday} ${date}`}
            onClick={() => onChange(day)}
            className={cn(
              'flex shrink-0 flex-col items-center rounded border px-3 py-2 text-sm',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface hover:bg-muted',
            )}
          >
            <span className="text-xs">{weekday}</span>
            <span className="font-medium">{date}</span>
          </button>
        );
      })}
    </div>
  );
}
