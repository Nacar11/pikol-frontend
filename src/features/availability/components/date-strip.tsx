import { cn } from '@/lib/cn';
import { addDays, formatDayChip, manilaToday } from '@/lib/manila';

/** Today plus `days - 1` more, as Manila calendar days. */
export function DateStrip({
  value,
  onChange,
  days = 14,
}: {
  value: string;
  onChange: (day: string) => void;
  days?: number;
}) {
  const today = manilaToday();
  return (
    <div role="group" aria-label="Choose a day" className="flex gap-2 overflow-x-auto pb-1">
      {Array.from({ length: days }, (_, i) => {
        const day = addDays(today, i);
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
