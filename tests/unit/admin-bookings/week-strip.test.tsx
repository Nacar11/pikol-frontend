import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import { WeekStrip } from '@/features/admin-bookings/components/week-strip';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/admin-bookings/api', () => ({ adminBookingsApi: { occupancy: vi.fn() } }));

const onChange = vi.fn();

function strip(value: string) {
  return <WeekStrip venueId={1} value={value} onChange={onChange} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminBookingsApi.occupancy).mockResolvedValue([
    { date: '2026-09-07', booked_hours: 9, bookable_hours: 48 },
  ]);
});

describe('WeekStrip', () => {
  it('shows two weeks from the selected day’s Monday, with each day’s usage', async () => {
    renderWithAuth(strip('2026-09-09'), { status: 'authenticated' });

    const days = within(screen.getByRole('group', { name: 'Choose a day' }));
    expect(days.getAllByRole('button')).toHaveLength(14);
    expect(
      await screen.findByRole('button', { name: 'Mon 7 Sep, 9 of 48 hours booked' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Wed 9 Sep/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Sun 20 Sep/ })).toBeInTheDocument();
    expect(screen.getByText('Week 37 · 7–13 Sep')).toBeInTheDocument();
    expect(adminBookingsApi.occupancy).toHaveBeenCalledWith(1, '2026-09-07', 14);
  });

  it('picks a day', async () => {
    renderWithAuth(strip('2026-09-09'), { status: 'authenticated' });
    await userEvent.click(screen.getByRole('button', { name: /^Fri 11 Sep/ }));
    expect(onChange).toHaveBeenCalledWith('2026-09-11');
  });

  it('pages a week at a time without moving the selected day', async () => {
    renderWithAuth(strip('2026-09-09'), { status: 'authenticated' });

    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));

    expect(screen.getByRole('button', { name: /^Mon 14 Sep/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Wed 9 Sep/ })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(adminBookingsApi.occupancy).toHaveBeenLastCalledWith(1, '2026-09-14', 14),
    );
  });

  it('re-anchors when the day moves outside the two weeks', async () => {
    function Harness() {
      const [value, setValue] = useState('2026-09-09');
      return (
        <>
          <button onClick={() => setValue('2026-10-01')}>jump</button>
          {strip(value)}
        </>
      );
    }
    renderWithAuth(<Harness />, { status: 'authenticated' });

    await userEvent.click(screen.getByRole('button', { name: 'jump' }));

    expect(screen.getByRole('button', { name: /^Mon 28 Sep/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Thu 1 Oct/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
