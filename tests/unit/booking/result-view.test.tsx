import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutApi } from '@/features/booking/api';
import { ResultView } from '@/features/booking/components/result-view';
import type { CheckoutStatus } from '@/features/booking';
import { renderWithAuth } from '../auth/render';
import { checkoutFixture } from './fixtures';

vi.mock('@/features/booking/api', () => ({
  checkoutApi: { get: vi.fn(), refresh: vi.fn(), events: vi.fn() },
}));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const EVENTS = {
  data: [
    {
      id: 2,
      type: 'PAYMENT_SUCCEEDED' as const,
      occurred_at: '2026-10-28T07:02:00Z',
      actor: { kind: 'SYSTEM' as const, name: null },
      booking_id: null,
      reference_code: null,
      court_name: null,
      data: { amount_centavos: 103000, method: 'ONLINE' },
      derived: false,
    },
    {
      id: 1,
      type: 'HOLD_PLACED' as const,
      occurred_at: '2026-10-28T07:00:00Z',
      actor: { kind: 'CUSTOMER' as const, name: 'You' },
      booking_id: 7,
      reference_code: 'PKL-AB234',
      court_name: 'Court 1',
      data: {},
      derived: false,
    },
  ],
  total: 2,
  page: 1,
  limit: 2,
  has_more: false,
};

function show() {
  return renderWithAuth(<ResultView id={1} />, {
    status: 'authenticated',
    user: { is_customer: true } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Arriving asks Maya once; by default it has nothing new to say.
  vi.mocked(checkoutApi.refresh).mockImplementation(() => checkoutApi.get(1));
  vi.mocked(checkoutApi.events).mockResolvedValue(EVENTS);
});
afterEach(() => vi.useRealTimers());

describe('ResultView', () => {
  it.each<[CheckoutStatus, string, string]>([
    ['PENDING', 'Confirming your payment…', 'This page updates by itself.'],
    ['SUCCESSFUL', 'Payment successful', 'Paid bookings are final.'],
    ['FAILED', 'Payment failed', "Your payment didn't go through, so the hours were released."],
    ['CANCELLED', 'Payment cancelled', 'The hours are free again.'],
  ])('shows %s', async (status, heading, line) => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture({ status }));
    show();

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByText(line)).toBeInTheDocument();
  });

  it('shows the reference on success', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture({ status: 'SUCCESSFUL' }));
    show();

    expect(await screen.findByText('PKL-AB234')).toBeInTheDocument();
    expect(screen.getByText('Court 1 · 10 AM – 12 PM')).toBeInTheDocument();
  });

  it('explains a late payment that was refunded', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(
      checkoutFixture({ status: 'REFUNDED', refund_kind: 'VOID' }),
    );
    show();

    expect(
      await screen.findByRole('heading', { name: 'Paid too late — fully refunded' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your hold had ended and an hour was taken, so nothing was booked. The full amount was voided.',
      ),
    ).toBeInTheDocument();
  });

  it('offers Book again after a failure', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture({ status: 'FAILED' }));
    show();

    expect(await screen.findByRole('link', { name: 'Book again' })).toHaveAttribute(
      'href',
      '/book/3',
    );
  });

  it('asks Maya once on arrival — the webhook may never have come', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture());
    show();

    await screen.findByRole('heading', { name: 'Confirming your payment…' });
    expect(checkoutApi.refresh).toHaveBeenCalledTimes(1);
    expect(checkoutApi.refresh).toHaveBeenCalledWith(1);
  });

  it('keeps confirming a cancelled checkout while Maya may still take payment', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(
      checkoutFixture({ status: 'CANCELLED', awaiting_payment: true }),
    );
    show();

    expect(
      await screen.findByRole('heading', { name: 'Confirming your payment…' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your hold has ended. If you paid on Maya, this page updates by itself.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book again' })).toBeNull();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('asks the server again on Check again', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture());
    show();
    await screen.findByRole('heading', { name: 'Confirming your payment…' });
    vi.mocked(checkoutApi.refresh).mockResolvedValue(checkoutFixture({ status: 'SUCCESSFUL' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Check again' }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(checkoutApi.refresh).toHaveBeenCalledWith(1);
  });

  it('polls while Maya may still take payment', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-28T02:00:00Z') });
    vi.mocked(checkoutApi.get).mockResolvedValue(
      checkoutFixture({ status: 'CANCELLED', awaiting_payment: true }),
    );
    show();
    await vi.advanceTimersByTimeAsync(0);
    const before = vi.mocked(checkoutApi.get).mock.calls.length;

    await vi.advanceTimersByTimeAsync(3_000);

    expect(vi.mocked(checkoutApi.get).mock.calls.length).toBeGreaterThan(before);
  });

  it('polls every 3 seconds while pending, and stops after 2 minutes', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-28T02:00:00Z') });
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture());
    show();
    await vi.advanceTimersByTimeAsync(0);
    const settled = vi.mocked(checkoutApi.get).mock.calls.length;

    await vi.advanceTimersByTimeAsync(3_000);
    expect(checkoutApi.get).toHaveBeenCalledTimes(settled + 1);

    await vi.advanceTimersByTimeAsync(120_000);
    const calls = vi.mocked(checkoutApi.get).mock.calls.length;
    await vi.advanceTimersByTimeAsync(9_000);
    expect(checkoutApi.get).toHaveBeenCalledTimes(calls);
    expect(calls - settled).toBeLessThanOrEqual(41);
  });

  it('shows the tracker of what happened to this payment', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture({ status: 'SUCCESSFUL' }));
    show();

    const list = await screen.findByRole('list', { name: 'Action events' });
    expect(list).toHaveTextContent('Payment successful');
    expect(list).toHaveTextContent('Hours held');
    expect(list).toHaveTextContent('You');
    expect(checkoutApi.events).toHaveBeenCalledWith(1);
  });

  it('keeps the tracker on screen while it refetches for a new status', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture({ status: 'PENDING' }));
    let landed: (c: ReturnType<typeof checkoutFixture>) => void = () => {};
    vi.mocked(checkoutApi.refresh).mockReturnValue(new Promise((r) => (landed = r)));
    show();
    await screen.findByRole('list', { name: 'Action events' });

    // The status changes; the tracker's refetch for it has not answered yet.
    vi.mocked(checkoutApi.events).mockReturnValue(new Promise(() => {}));
    landed(checkoutFixture({ status: 'SUCCESSFUL' }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Action events' })).toBeInTheDocument();
  });
});
