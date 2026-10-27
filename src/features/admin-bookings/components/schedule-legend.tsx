import { cn } from '@/lib/cn';
import { BLOCK_LABELS, type BlockKind } from '../schedule-model';
import { BLOCK_STYLES } from './booking-block';

const ORDER: BlockKind[] = [
  'CONFIRMED',
  'AWAITING_PAYMENT',
  'IN_PROGRESS',
  'COMPLETED',
  'NO_SHOW',
  'CLOSED',
];

export function ScheduleLegend({ booked, bookable }: { booked: number; bookable: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-4 rounded-sm border border-input bg-surface" />
          Open
        </li>
        {ORDER.map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span aria-hidden className={cn('h-3 w-4 rounded-sm', BLOCK_STYLES[kind])} />
            <span className={kind === 'NO_SHOW' ? 'line-through' : undefined}>
              {BLOCK_LABELS[kind]}
            </span>
          </li>
        ))}
      </ul>
      <p className="ml-auto tabular-nums">
        {booked} of {bookable} court-hours booked
      </p>
    </div>
  );
}
