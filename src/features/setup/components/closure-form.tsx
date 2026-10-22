'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorCode, errorMessage } from '@/lib/api-error';
import { formatHourOfDay, manilaInstant, manilaToday } from '@/lib/manila';
import { useAdminCourts, useCloseCourts } from '../hooks/use-setup';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

const SELECT_CLASS = 'h-10 w-full rounded border border-border bg-surface px-3 text-sm';

function serverMessage(err: unknown): string {
  const detail = errorMessage(err);
  return errorCode(err) === 'SLOT_UNAVAILABLE'
    ? `Some of those hours are already booked. Nothing was closed. ${detail}`
    : detail;
}

export function ClosureForm({ venueId }: { venueId: number }) {
  const { data } = useAdminCourts(venueId);
  const close = useCloseCourts();
  const today = manilaToday();
  const [courtIds, setCourtIds] = useState<number[]>([]);
  const [startDay, setStartDay] = useState(today);
  const [startHour, setStartHour] = useState(8);
  const [endDay, setEndDay] = useState(today);
  const [endHour, setEndHour] = useState(12);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const courts = (data?.data ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const allChecked = courts.length > 0 && courts.every((c) => courtIds.includes(c.id));

  function toggle(id: number) {
    setCourtIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    close.reset();
    if (!startDay || !endDay) return setProblem('Choose a start and an end day.');
    const starts_at = manilaInstant(startDay, startHour);
    const ends_at = manilaInstant(endDay, endHour);
    const checked = courts.filter((c) => courtIds.includes(c.id)).map((c) => c.id);
    if (checked.length === 0) return setProblem('Choose at least one court.');
    if (Date.parse(ends_at) <= Date.parse(starts_at)) {
      return setProblem('The end must be after the start.');
    }
    if (!reason.trim()) return setProblem('Give a reason.');
    setProblem(null);
    close.mutate(
      { court_ids: checked, starts_at, ends_at, reason: reason.trim() },
      {
        onSuccess: () => {
          setCourtIds([]);
          setReason('');
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded border border-border bg-surface p-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Courts</legend>
        {courts.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => setCourtIds(allChecked ? [] : courts.map((c) => c.id))}
            />
            Select all
          </label>
        )}
        {courts.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={courtIds.includes(c.id)}
              onChange={() => toggle(c.id)}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="closure-start-day">Start day</Label>
          <Input
            id="closure-start-day"
            type="date"
            value={startDay}
            onChange={(e) => setStartDay(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="closure-start-hour">Start hour</Label>
          <HourSelect id="closure-start-hour" value={startHour} onChange={setStartHour} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="closure-end-day">End day</Label>
          <Input
            id="closure-end-day"
            type="date"
            value={endDay}
            onChange={(e) => setEndDay(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="closure-end-hour">End hour</Label>
          <HourSelect id="closure-end-hour" value={endHour} onChange={setEndHour} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="closure-reason">Reason</Label>
        <Input id="closure-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {problem && <Alert tone="error">{problem}</Alert>}
      {close.isError && <Alert tone="error">{serverMessage(close.error)}</Alert>}
      <Button type="submit" loading={close.isPending}>
        Close courts
      </Button>
    </form>
  );
}

function HourSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (hour: number) => void;
}) {
  return (
    <select
      id={id}
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {formatHourOfDay(h)}
        </option>
      ))}
    </select>
  );
}
