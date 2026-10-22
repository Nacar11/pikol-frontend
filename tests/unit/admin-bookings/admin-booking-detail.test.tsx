import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminBooking } from '@/features/admin-bookings';
import { AdminBookingDetail } from '@/features/admin-bookings';
import { adminBookingsApi } from '@/features/admin-bookings/api';
import { authApi } from '@/features/auth/api';
import { AuthContext } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: {
    get: vi.fn(),
    markPaid: vi.fn(),
    outcome: vi.fn(),
    cancel: vi.fn(),
    reopenClosure: vi.fn(),
  },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

const api = vi.mocked(adminBookingsApi);
const user = { id: 1, venue_id: 1, role: 'VENUE_STAFF' } as never;
const ALL = ['BOOKING:MarkPaid', 'BOOKING:SetOutcome', 'BOOKING:CancelAny', 'CLOSURE:Manage'];
const START = Date.UTC(2026, 9, 23, 10, 0, 0); // 6 PM Manila, 23 Oct
const HOUR = 3_600_000;

function booking(over: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id: 42,
    reference_code: 'PKL-42',
    court_id: 7,
    venue_id: 1,
    court_name: 'Court 2',
    venue_name: 'Riverside',
    type: 'WALK_IN',
    booking_status: 'CONFIRMED',
    payment_status: 'UNPAID',
    display_status: 'CONFIRMED',
    starts_at: new Date(START).toISOString(),
    ends_at: new Date(START + 2 * HOUR).toISOString(),
    hours: 2,
    slots: [
      { starts_at: new Date(START).toISOString(), price_centavos: 60000 },
      { starts_at: new Date(START + HOUR).toISOString(), price_centavos: 70000 },
    ],
    price_centavos: 130000,
    fee_centavos: 2000,
    total_centavos: 132000,
    payment_method: null,
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: '2026-10-22T00:00:00Z',
    player: null,
    created_by_user_id: 1,
    ...over,
  };
}

/** The server's state after an action: both the response and the next GET. */
function after(fn: ReturnType<typeof vi.fn>, next: AdminBooking) {
  fn.mockImplementation(() => {
    api.get.mockResolvedValue(next);
    return Promise.resolve(next);
  });
}

function apiError(status: number, code: string, detail: string) {
  return new ApiError(status, { detail, code, request_id: 'r' });
}

function setup(permissions: string[] = ALL) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  const qc = createQueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider
        value={{ status: 'authenticated', user, login: vi.fn(), logout: vi.fn() }}
      >
        <AdminBookingDetail id={42} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { qc, invalidate };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(booking());
});

describe('AdminBookingDetail', () => {
  it('shows the booking, its prices and the walk-in label', async () => {
    api.get.mockResolvedValue(
      booking({ notes: 'Bring balls', payment_method: 'CASH', cancellation_reason: null }),
    );
    setup();
    expect(await screen.findByText('PKL-42')).toBeInTheDocument();
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    expect(screen.getByText('Riverside · Court 2')).toBeInTheDocument();
    expect(screen.getByText('₱600')).toBeInTheDocument();
    expect(screen.getByText('₱700')).toBeInTheDocument();
    expect(screen.getByText('₱1,320')).toBeInTheDocument();
    expect(screen.getByText('Bring balls')).toBeInTheDocument();
  });

  it.each([
    ['CASH', 'Paid by Cash'],
    ['MANUAL_GCASH', 'Paid by GCash (manual)'],
    ['ONLINE', 'Paid by Online'],
  ] as const)('labels the payment method %s', async (method, label) => {
    api.get.mockResolvedValue(booking({ payment_method: method }));
    setup();
    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it('shows the player name and email', async () => {
    api.get.mockResolvedValue(
      booking({
        type: 'PLAYER_BOOKING',
        player: { id: 5, first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com' },
      }),
    );
    setup();
    expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('marks a walk-in paid with cash and shows Paid', async () => {
    after(api.markPaid, booking({ payment_status: 'PAID', payment_method: 'CASH' }));
    const { qc, invalidate } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cash' }));
    await waitFor(() => expect(api.markPaid).toHaveBeenCalledWith(42, 'CASH'));
    expect(await screen.findByText('Paid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cash' })).not.toBeInTheDocument();
    expect(qc.getQueryData(['admin-bookings', 'detail', 42])).toMatchObject({
      payment_status: 'PAID',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin-bookings'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] });
  });

  it('sends MANUAL_GCASH from the GCash button', async () => {
    after(api.markPaid, booking({ payment_status: 'PAID' }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'GCash (manual)' }));
    await waitFor(() => expect(api.markPaid).toHaveBeenCalledWith(42, 'MANUAL_GCASH'));
  });

  it('renders a 409 ALREADY_PAID and refetches to the true state', async () => {
    // Another staff member paid in the meantime; the 409 arrives, then the refetch sees it.
    api.markPaid.mockImplementation(() => {
      api.get.mockResolvedValue(booking({ payment_status: 'PAID', payment_method: 'CASH' }));
      return Promise.reject(apiError(409, 'ALREADY_PAID', 'Booking is already paid'));
    });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Cash' }));
    expect(await screen.findByText('Booking is already paid')).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cash' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('PKL-42')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('records an outcome once the booking has started', async () => {
    api.get.mockResolvedValue(booking({ payment_status: 'PAID', display_status: 'IN_PROGRESS' }));
    after(
      api.outcome,
      booking({ payment_status: 'PAID', booking_status: 'COMPLETED', display_status: 'COMPLETED' }),
    );
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Completed' }));
    await waitFor(() => expect(api.outcome).toHaveBeenCalledWith(42, 'COMPLETED'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'No-show' })).not.toBeInTheDocument(),
    );
  });

  it('keeps Cancel booking disabled until a reason is typed, then posts it', async () => {
    after(
      api.cancel,
      booking({
        booking_status: 'CANCELLED',
        display_status: 'CANCELLED',
        cancellation_reason: 'Rain',
      }),
    );
    setup();
    expect(await screen.findByText('No refund is issued.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Cancel booking' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason for cancelling'), '   ');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason for cancelling'), 'Rain');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith(42, 'Rain'));
    expect(await screen.findByText('Rain')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reason for cancelling')).not.toBeInTheDocument();
  });

  it('reopens a closure through the closures route', async () => {
    api.get.mockResolvedValue(booking({ type: 'MAINTENANCE', payment_status: 'UNPAID' }));
    after(
      api.reopenClosure,
      booking({ type: 'MAINTENANCE', booking_status: 'CANCELLED', display_status: 'CANCELLED' }),
    );
    setup();
    await userEvent.type(await screen.findByLabelText('Why is the court reopening?'), 'Fixed');
    await userEvent.click(screen.getByRole('button', { name: 'Reopen court' }));
    await waitFor(() => expect(api.reopenClosure).toHaveBeenCalledWith(42, 'Fixed'));
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('offers no actions without the permissions', async () => {
    setup(['BOOKING:ReadAny']);
    await screen.findByText('PKL-42');
    expect(screen.queryByRole('button', { name: 'Cash' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reason for cancelling')).not.toBeInTheDocument();
  });

  it('shows not-found with a link to the schedule on a 404', async () => {
    api.get.mockRejectedValue(apiError(404, 'NOT_FOUND', 'Booking not found'));
    setup();
    expect(await screen.findByText('Booking not found')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/staff/schedule');
  });
});
