import { cn } from '@/lib/cn';
import { formatEventTime } from '@/lib/manila';
import { EVENT_LOOK, eventDetail, type ActionEvent, type EventTone } from '../action-events';

const DOT: Record<EventTone, string> = {
  wait: 'bg-event-wait text-white',
  confirmed: 'bg-event-confirmed text-white',
  done: 'bg-event-done text-white',
  bad: 'bg-event-bad text-white',
  neutral: 'bg-event-neutral text-white',
};

/** The newest step gets a halo, like a tracker's "you are here". */
const HALO: Record<EventTone, string> = {
  wait: 'ring-4 ring-event-wait-soft',
  confirmed: 'ring-4 ring-event-confirmed-soft',
  done: 'ring-4 ring-event-done-soft',
  bad: 'ring-4 ring-event-bad-soft',
  neutral: 'ring-4 ring-event-neutral-soft',
};

const CHIP: Record<EventTone, string> = {
  wait: 'bg-event-wait-soft text-event-wait-fg',
  confirmed: 'bg-event-confirmed-soft text-event-confirmed-fg',
  done: 'bg-event-done-soft text-event-done-fg',
  bad: 'bg-event-bad-soft text-event-bad-fg',
  neutral: 'bg-event-neutral-soft text-event-neutral-fg',
};

/**
 * What happened to a booking, newest first, like a parcel tracker. Colour
 * marks the kind of step, but each chip says its word and each dot carries
 * its own icon, so nothing rests on colour alone. Shared by the console and
 * the customer demo; the server already decides what each may see.
 */
export function ActionTimeline({
  events,
  showCourt,
}: {
  events: ActionEvent[];
  showCourt: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events yet.</p>;
  }
  return (
    <ol aria-label="Action events" className="space-y-0">
      {events.map((e, i) => {
        const look = EVENT_LOOK[e.type];
        const Icon = look.icon;
        const detail = eventDetail(e);
        const when = formatEventTime(e.occurred_at);
        const last = i === events.length - 1;
        return (
          <li
            key={e.id ?? `${e.type}-${e.booking_id}-${e.occurred_at}`}
            className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 pb-5 last:pb-0 sm:grid-cols-[1.75rem_1fr_auto]"
          >
            {!last && (
              <span
                aria-hidden
                className="absolute bottom-0 left-[0.8125rem] top-7 w-0.5 bg-border"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 inline-flex size-7 items-center justify-center rounded-full',
                DOT[look.tone],
                i === 0 && HALO[look.tone],
              )}
            >
              <Icon className="size-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
                {showCourt && e.court_name && (
                  <span className="font-normal text-muted-foreground">{e.court_name} ·</span>
                )}
                {look.title}
                <span
                  className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', CHIP[look.tone])}
                >
                  {look.chip}
                </span>
              </p>
              {detail && <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{e.actor.name ?? 'System'}</p>
            </div>
            <time
              dateTime={e.occurred_at}
              className="col-start-2 mt-1 text-xs text-muted-foreground sm:col-start-3 sm:mt-0 sm:text-right"
            >
              <span className="font-medium text-foreground">{when.time}</span>
              <span className="sm:hidden"> · </span>
              <span className="sm:block">{when.day}</span>
            </time>
          </li>
        );
      })}
    </ol>
  );
}
