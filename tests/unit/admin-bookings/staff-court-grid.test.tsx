import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import { StaffCourtGrid } from '@/features/admin-bookings/components/staff-court-grid';
import { blocksFor } from '@/features/admin-bookings/schedule-model';
import type { Availability } from '@/features/availability';

const DAY = Date.UTC(2026, 9, 22, 16);
const at = (hour: number) => new Date(DAY + hour * 3_600_000).toISOString();

const data: Availability = {
  venue_id: 1,
  date: '2026-10-23',
  courts: [
    {
      court_id: 7,
      name: 'Court 1',
      slots: Array.from({ length: 24 }, (_, h) => ({
        starts_at: at(h),
        hour: h,
        status: h === 18 || h === 19 ? ('BOOKED' as const) : ('AVAILABLE' as const),
        price_centavos: 50000,
      })),
    },
  ],
};

const session = {
  id: 4,
  court_id: 7,
  type: 'PLAYER_BOOKING',
  booking_status: 'CONFIRMED',
  payment_status: 'PAID',
  starts_at: at(18),
  ends_at: at(20),
  expires_at: null,
  player: { id: 1, first_name: 'Paolo', last_name: 'Garcia', email: 'p@x.ph' },
} as AdminBooking;

function renderGrid(onCellTap?: (courtId: number, index: number) => void) {
  const blocks = blocksFor(data, [session], Date.parse(at(9)));
  return render(
    <StaffCourtGrid
      data={data}
      blocks={blocks}
      selection={null}
      onCellTap={onCellTap}
      scrollToHour={null}
    />,
  );
}

describe('StaffCourtGrid', () => {
  it('draws a two-hour booking as one block, linking to its detail', () => {
    renderGrid();
    const block = screen.getByRole('link', {
      name: 'Court 1, 6 PM – 8 PM, Paolo Garcia, confirmed',
    });
    expect(block).toHaveAttribute('href', '/staff/bookings/4');
    expect(within(block).getByText('Confirmed')).toBeInTheDocument();
    // No separate cells under the block.
    expect(screen.queryByLabelText(/Court 1, 7 PM/)).not.toBeInTheDocument();
  });

  it('heads each court with its number, price and booked hours', () => {
    renderGrid();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('₱500 / hr')).toBeInTheDocument();
    expect(screen.getByText('2 of 24 h booked')).toBeInTheDocument();
  });

  it('makes open hours buttons only when walk-ins are allowed', async () => {
    const tap = vi.fn();
    renderGrid(tap);
    await userEvent.click(screen.getByRole('button', { name: 'Court 1, 9 AM, available, ₱500' }));
    expect(tap).toHaveBeenCalledWith(7, 9);
  });

  it('is read-only without walk-ins', () => {
    renderGrid();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Court 1, 9 AM, open' })).toBeInTheDocument();
  });
});
