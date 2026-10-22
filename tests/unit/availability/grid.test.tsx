import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AvailabilityGrid } from '@/features/availability';
import { availabilityApi } from '@/features/availability/api';
import type { Availability } from '@/features/availability/schemas';
import type { ApiClient } from '@/lib/api-client';

const MIDNIGHT = Date.UTC(2026, 9, 22, 16, 0, 0); // 2026-10-23 00:00 Manila

function fixture(overrides: Record<number, Partial<Availability['courts'][0]['slots'][0]>> = {}) {
  const slots = Array.from({ length: 24 }, (_, i) => ({
    starts_at: new Date(MIDNIGHT + i * 3_600_000).toISOString(),
    hour: i,
    status: 'AVAILABLE' as const,
    price_centavos: i === 18 ? 60000 : 50000,
    ...overrides[i],
  }));
  return {
    venue_id: 1,
    date: '2026-10-23',
    courts: [{ court_id: 7, name: 'Court 1', slots }],
  } satisfies Availability;
}

describe('AvailabilityGrid', () => {
  it('renders 24 hour rows starting at 12 AM', () => {
    render(<AvailabilityGrid data={fixture()} selection={null} />);
    const rows = screen.getAllByTestId('hour-row');
    expect(rows).toHaveLength(24);
    expect(within(rows[0]!).getByText('12 AM')).toBeInTheDocument();
    expect(within(rows[18]!).getByText('6 PM')).toBeInTheDocument();
  });

  it('shows peak and off-peak prices in the cell', () => {
    render(<AvailabilityGrid data={fixture()} selection={null} />);
    expect(screen.getByLabelText('Court 1, 6 PM, available, ₱600')).toHaveTextContent('₱600');
    expect(screen.getByLabelText('Court 1, 5 PM, available, ₱500')).toHaveTextContent('₱500');
  });

  it('renders a BOOKED cell with no price and no button', () => {
    render(
      <AvailabilityGrid
        data={fixture({ 18: { status: 'BOOKED' } })}
        selection={null}
        onCellTap={() => {}}
      />,
    );
    const cell = screen.getByLabelText('Court 1, 6 PM, booked');
    expect(cell).not.toHaveTextContent('₱');
    expect(cell.tagName).not.toBe('BUTTON');
  });

  it('has no buttons without onCellTap', () => {
    render(<AvailabilityGrid data={fixture()} selection={null} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('makes available cells buttons that report court and index', async () => {
    const tap = vi.fn();
    render(<AvailabilityGrid data={fixture()} selection={null} onCellTap={tap} />);
    await userEvent.click(screen.getByLabelText('Court 1, 6 PM, available, ₱600'));
    expect(tap).toHaveBeenCalledWith(7, 18);
  });

  it('marks selected cells', () => {
    render(
      <AvailabilityGrid
        data={fixture()}
        selection={{ court_id: 7, start: 18, end: 19 }}
        onCellTap={() => {}}
      />,
    );
    const cell = screen.getByLabelText('Court 1, 6 PM, selected, ₱600');
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Court 1, 7 PM, selected, ₱500')).toBeInTheDocument();
    expect(screen.getByLabelText('Court 1, 8 PM, available, ₱500')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('availabilityApi.day', () => {
  it('requests the grid and parses it', async () => {
    const get = vi.fn().mockResolvedValue(fixture());
    const out = await availabilityApi.day(1, '2026-10-23', { get } as unknown as ApiClient);
    expect(get).toHaveBeenCalledWith('/availability', {
      params: { venue_id: 1, date: '2026-10-23' },
    });
    expect(out.courts[0]!.slots).toHaveLength(24);
  });

  it('throws on a malformed payload', async () => {
    const get = vi.fn().mockResolvedValue({ venue_id: 1, date: 'x', courts: [{ court_id: 1 }] });
    await expect(
      availabilityApi.day(1, '2026-10-23', { get } as unknown as ApiClient),
    ).rejects.toThrow();
  });
});
