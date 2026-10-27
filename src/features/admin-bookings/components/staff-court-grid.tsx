'use client';

import { useEffect, useRef } from 'react';
import type { Availability, GridSlot, Selection } from '@/features/availability';
import { cn } from '@/lib/cn';
import { formatHour, formatHourOfDay } from '@/lib/manila';
import { formatPeso } from '@/lib/money';
import { courtHours, priceLabel, staffSelectable, type Block } from '../schedule-model';
import { BookingBlock } from './booking-block';

/** One hour's row height. Fixed, so a block spanning N hours is N rows. */
const ROW_PX = 56;

type Props = {
  data: Availability;
  blocks: Block[];
  selection: Selection | null;
  /** Without it the grid is read-only: no open cell is a button. */
  onCellTap?: (courtId: number, index: number) => void;
  /** Today: the hour to scroll to on load. */
  scrollToHour: number | null;
};

/**
 * Time down, one column per court (the reference layout). A booking is one
 * block across its hours; open hours are buttons when walk-ins are allowed.
 * The frame scrolls on its own — the page never scrolls sideways.
 */
export function StaffCourtGrid({ data, blocks, selection, onCellTap, scrollToHour }: Props) {
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToHour !== null && frame.current) {
      frame.current.scrollTop = Math.max(0, scrollToHour * ROW_PX - ROW_PX / 2);
    }
    // Only on mount: a refetch must not yank the view back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data.courts.length === 0) {
    return <p className="text-sm text-muted-foreground">This venue has no courts yet.</p>;
  }
  const columns = `4.5rem repeat(${data.courts.length}, minmax(13rem, 1fr))`;
  const covered = new Set(
    blocks.flatMap((b) => Array.from({ length: b.span }, (_, i) => `${b.courtId}:${b.start + i}`)),
  );

  return (
    <div
      ref={frame}
      className="max-h-[72vh] overflow-auto rounded-md border border-border bg-surface"
    >
      <div style={{ gridTemplateColumns: columns }} className="grid min-w-max">
        {/* Header row, sticky as the hours scroll. */}
        <div className="sticky left-0 top-0 z-30 flex items-end border-b border-r border-border bg-surface px-3 pb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Time
        </div>
        {data.courts.map((court, i) => {
          const { booked, closed } = courtHours(blocks, court.court_id);
          const bookable = 24 - closed;
          return (
            <div
              key={court.court_id}
              className="sticky top-0 z-20 border-b border-l border-border bg-surface px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl font-bold tabular-nums leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{court.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {priceLabel(court)}
                    </span>
                  </div>
                  <span aria-hidden className="mt-2 block h-1 rounded-full bg-border">
                    <span
                      className="block h-1 rounded-full bg-primary"
                      style={{ width: `${bookable > 0 ? (booked / bookable) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                    {booked} of {bookable} h booked
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Body: hour labels in column 1, then each court's cells and blocks. */}
        <div
          style={{
            gridRow: `2 / span 24`,
            gridColumn: 1,
            gridTemplateRows: `repeat(24, ${ROW_PX}px)`,
          }}
          className="sticky left-0 z-10 grid border-r border-border bg-surface"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <span
              key={h}
              className="border-b border-border px-3 pt-1.5 text-xs tabular-nums text-muted-foreground"
            >
              {formatHourOfDay(h)}
            </span>
          ))}
        </div>
        {data.courts.map((court, c) => (
          <div
            key={court.court_id}
            style={{
              gridRow: `2 / span 24`,
              gridColumn: c + 2,
              gridTemplateRows: `repeat(24, ${ROW_PX}px)`,
            }}
            className="grid border-l border-border"
          >
            {court.slots.map((slot, i) =>
              covered.has(`${court.court_id}:${i}`) ? null : (
                <div
                  key={slot.starts_at}
                  style={{ gridRow: i + 1 }}
                  className="border-b border-border p-1"
                >
                  <Cell
                    court={court.name}
                    slot={slot}
                    selected={
                      selection?.court_id === court.court_id &&
                      i >= selection.start &&
                      i <= selection.end
                    }
                    onTap={onCellTap && (() => onCellTap(court.court_id, i))}
                  />
                </div>
              ),
            )}
            {blocks
              .filter((b) => b.courtId === court.court_id)
              .map((b) => (
                <div
                  key={b.booking.id}
                  style={{ gridRow: `${b.start + 1} / span ${b.span}` }}
                  className="border-b border-border p-1"
                >
                  <BookingBlock block={b} court={court.name} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const CELL = 'flex h-full w-full items-center justify-center rounded text-xs';

function Cell({
  court,
  slot,
  selected,
  onTap,
}: {
  court: string;
  slot: GridSlot;
  selected: boolean;
  onTap?: () => void;
}) {
  const where = `${court}, ${formatHour(slot.starts_at)}`;
  // The availability read can be a beat ahead of the bookings list; show the
  // slot as taken until the block arrives.
  if (slot.status === 'BOOKED' || slot.status === 'CLOSED') {
    const label = slot.status === 'BOOKED' ? 'Booked' : 'Closed';
    return (
      <div
        role="img"
        aria-label={`${where}, ${label.toLowerCase()}`}
        className={cn(
          CELL,
          slot.status === 'CLOSED' ? 'bg-hatch' : 'bg-muted',
          'text-muted-foreground',
        )}
      >
        {label}
      </div>
    );
  }
  const open = staffSelectable(slot.status);
  if (!open || !onTap) {
    return (
      <div
        role="img"
        aria-label={`${where}, ${slot.status === 'PAST' ? 'past' : 'open'}`}
        className={cn(CELL, 'text-muted-foreground')}
      />
    );
  }
  const price = formatPeso(slot.price_centavos);
  const started = slot.status === 'PAST';
  const label = `${where}, ${selected ? 'selected' : 'available'}${started ? ', already started' : ''}, ${price}`;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onTap}
      className={cn(
        CELL,
        'group font-medium transition-colors duration-150',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'text-transparent hover:bg-muted hover:text-foreground focus-visible:text-foreground',
      )}
    >
      {selected ? 'Selected' : price}
    </button>
  );
}
