'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { errorCode, errorMessage } from '@/lib/api-error';
import {
  addDays,
  formatDayChip,
  formatHourOfDay,
  isManilaDay,
  manilaHourNow,
  manilaInstant,
  manilaToday,
  nextHourRange,
} from '@/lib/manila';
import { useCourts } from '@/features/catalog';
import { useCloseCourts } from '../hooks/use-setup';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: formatHourOfDay(h),
}));
const HOUR_MS = 3_600_000;

/** One click fills the reason; the field stays free text. */
const REASONS = ['Maintenance', 'Private event', 'Tournament', 'Weather'];

type Range = { startDay: string; startHour: number; endDay: string; endHour: number };

/** A Manila day + hour moved by whole hours, through the instant. */
function shift(day: string, hour: number, hours: number): { day: string; hour: number } {
  const at = new Date(Date.parse(manilaInstant(day, hour)) + hours * HOUR_MS);
  return { day: manilaToday(at), hour: manilaHourNow(at) };
}

/** Quick ranges. Each starts no earlier than the next whole hour, which is
 * the soonest start the server accepts. */
function presets(now: Date): { label: string; range: Range | null }[] {
  const next = nextHourRange(now);
  const today = manilaToday(now);
  const tomorrow = addDays(today, 1);
  const twoLater = shift(next.startDay, next.startHour, 2);
  return [
    {
      label: 'Next 2 hours',
      range: { ...next, endDay: twoLater.day, endHour: twoLater.hour },
    },
    {
      label: 'Rest of today',
      // Past 11 PM there is no "rest of today" left to close.
      range: next.startDay === today ? { ...next, endDay: tomorrow, endHour: 0 } : null,
    },
    {
      label: 'All day tomorrow',
      range: { startDay: tomorrow, startHour: 0, endDay: addDays(tomorrow, 1), endHour: 0 },
    },
  ];
}

function sameRange(a: Range, b: Range): boolean {
  return (
    a.startDay === b.startDay &&
    a.startHour === b.startHour &&
    a.endDay === b.endDay &&
    a.endHour === b.endHour
  );
}

/** "Tue 27 Oct · 4 PM – 5 PM", or both days when the range crosses midnight. */
function describe(r: Range): string {
  const start = formatDayChip(r.startDay);
  const from = `${start.weekday} ${start.date}`;
  // Ending at 12 AM the next day still reads as one day.
  const endsSameDay =
    r.endDay === r.startDay || (r.endHour === 0 && r.endDay === addDays(r.startDay, 1));
  if (endsSameDay) {
    return `${from} · ${formatHourOfDay(r.startHour)} – ${formatHourOfDay(r.endHour)}`;
  }
  const end = formatDayChip(r.endDay);
  return `${from}, ${formatHourOfDay(r.startHour)} – ${end.weekday} ${end.date}, ${formatHourOfDay(r.endHour)}`;
}

function serverMessage(err: unknown): string {
  const detail = errorMessage(err);
  return errorCode(err) === 'SLOT_UNAVAILABLE'
    ? `Some of those hours are already booked. Nothing was closed. ${detail}`
    : detail;
}

/** "01 Courts" — the numbered step heading of the form. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-2">
      <span aria-hidden className="text-sm font-semibold tabular-nums">
        {String(n).padStart(2, '0')}
      </span>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
    </span>
  );
}

export function ClosureForm({ venueId }: { venueId: number }) {
  const { data, isError, error } = useCourts(venueId);
  const close = useCloseCourts();
  const [initial] = useState(() => nextHourRange());
  const [courtIds, setCourtIds] = useState<number[]>([]);
  const [range, setRange] = useState<Range>(initial);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const courts = (data?.data ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const checked = courts.filter((c) => courtIds.includes(c.id)).map((c) => c.id);
  const allChecked = courts.length > 0 && checked.length === courts.length;

  const complete = isManilaDay(range.startDay) && isManilaDay(range.endDay);
  const hours = complete
    ? (Date.parse(manilaInstant(range.endDay, range.endHour)) -
        Date.parse(manilaInstant(range.startDay, range.startHour))) /
      HOUR_MS
    : 0;

  const set = (patch: Partial<Range>) => setRange((r) => ({ ...r, ...patch }));

  function toggle(id: number) {
    setCourtIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    close.reset();
    if (!complete) return setProblem('Choose a start and an end day.');
    if (checked.length === 0) return setProblem('Choose at least one court.');
    if (hours <= 0) return setProblem('The end must be after the start.');
    if (!reason.trim()) return setProblem('Give a reason.');
    setProblem(null);
    close.mutate(
      {
        court_ids: checked,
        starts_at: manilaInstant(range.startDay, range.startHour),
        ends_at: manilaInstant(range.endDay, range.endHour),
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setCourtIds([]);
          setReason('');
        },
      },
    );
  }

  const hint =
    checked.length === 0
      ? 'Pick at least one court'
      : `Closes ${checked.length} ${checked.length === 1 ? 'court' : 'courts'}${
          hours > 0 ? ` for ${hours} h` : ''
        }`;

  return (
    <form
      onSubmit={submit}
      aria-labelledby="new-closure"
      className="space-y-8 rounded-lg border border-border bg-surface p-5 sm:p-6"
    >
      <h2 id="new-closure" className="text-lg font-semibold tracking-tight">
        New closure
      </h2>

      <fieldset className="space-y-3">
        <legend className="sr-only">Courts</legend>
        <div className="flex items-center justify-between gap-2">
          <span aria-hidden>
            <Step n={1}>Courts</Step>
          </span>
          {courts.length > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-foreground"
              onClick={() => setCourtIds(allChecked ? [] : courts.map((c) => c.id))}
            >
              {allChecked ? 'Clear' : 'Select all'}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {courts.map((c, i) => {
            const on = courtIds.includes(c.id);
            return (
              <label
                key={c.id}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded border px-3 text-sm transition-colors duration-150',
                  'focus-within:ring-2 focus-within:ring-ring',
                  on
                    ? 'border-foreground bg-muted font-medium'
                    : 'border-border hover:border-input hover:bg-muted/60',
                )}
              >
                <input
                  type="checkbox"
                  aria-label={c.name}
                  checked={on}
                  onChange={() => toggle(c.id)}
                  className="size-4 shrink-0 accent-foreground focus-visible:ring-0"
                />
                <span
                  aria-hidden
                  className="text-xs font-semibold tabular-nums text-muted-foreground"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span aria-hidden className="truncate">
                  {c.name}
                </span>
              </label>
            );
          })}
        </div>
        {isError && <Alert tone="error">{errorMessage(error)}</Alert>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend>
          <Step n={2}>When</Step>
        </legend>
        <div className="flex flex-wrap gap-2">
          {presets(new Date()).map(({ label, range: preset }) => (
            <Button
              key={label}
              type="button"
              variant="secondary"
              size="sm"
              disabled={preset === null}
              aria-pressed={preset !== null && sameRange(preset, range)}
              className="aria-pressed:border-foreground aria-pressed:bg-muted"
              onClick={() => preset && setRange(preset)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_7rem] items-center gap-2">
          <span className="text-sm text-muted-foreground">From</span>
          <Input
            aria-label="Start day"
            type="date"
            value={range.startDay}
            onChange={(e) => set({ startDay: e.target.value })}
          />
          <HourSelect
            label="Start hour"
            value={range.startHour}
            onChange={(h) => set({ startHour: h })}
          />
          <span className="text-sm text-muted-foreground">Until</span>
          <Input
            aria-label="End day"
            type="date"
            value={range.endDay}
            onChange={(e) => set({ endDay: e.target.value })}
          />
          <HourSelect
            label="End hour"
            value={range.endHour}
            onChange={(h) => set({ endHour: h })}
          />
        </div>
        <div
          aria-live="polite"
          className="flex items-baseline justify-between gap-4 border-t border-border pt-3"
        >
          <p className="text-sm font-medium">
            {complete ? describe(range) : 'Choose a start and an end day'}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{hours > 0 ? `${hours} h` : '—'}</p>
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span aria-hidden className="text-sm font-semibold tabular-nums">
            03
          </span>
          <label
            htmlFor="closure-reason"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Reason
          </label>
        </div>
        <Input
          id="closure-reason"
          placeholder="e.g. Line repainting"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Common reasons">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="rounded bg-muted px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-accent"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        {problem && <Alert tone="error">{problem}</Alert>}
        {close.isError && <Alert tone="error">{serverMessage(close.error)}</Alert>}
        <Button type="submit" size="full" loading={close.isPending}>
          Close courts
        </Button>
        <p className="text-center text-sm text-muted-foreground">{hint}</p>
      </div>
    </form>
  );
}

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (hour: number) => void;
}) {
  return (
    <Select
      aria-label={label}
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={HOUR_OPTIONS}
    />
  );
}
