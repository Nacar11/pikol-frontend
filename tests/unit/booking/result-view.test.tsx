import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutApi } from '@/features/booking/api';
import { ResultView } from '@/features/booking/components/result-view';
import type { CheckoutStatus } from '@/features/booking';
import { renderWithAuth } from '../auth/render';
import { checkoutFixture } from './fixtures';

vi.mock('@/features/booking/api', () => ({
  checkoutApi: { get: vi.fn(), refresh: vi.fn() },
}));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

function show() {
  return renderWithAuth(<ResultView id={1} />, {
    status: 'authenticated',
    user: { is_customer: true } as never,
  });
}

beforeEach(() => vi.clearAllMocks());
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

  it('asks the server again on Check again', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture());
    vi.mocked(checkoutApi.refresh).mockResolvedValue(checkoutFixture({ status: 'SUCCESSFUL' }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Check again' }));

    expect(await screen.findByRole('heading', { name: 'Payment successful' })).toBeInTheDocument();
    expect(checkoutApi.refresh).toHaveBeenCalledWith(1);
  });

  it('polls every 3 seconds while pending, and stops after 2 minutes', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-28T02:00:00Z') });
    vi.mocked(checkoutApi.get).mockResolvedValue(checkoutFixture());
    show();
    await vi.advanceTimersByTimeAsync(0);
    expect(checkoutApi.get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(checkoutApi.get).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(120_000);
    const calls = vi.mocked(checkoutApi.get).mock.calls.length;
    await vi.advanceTimersByTimeAsync(9_000);
    expect(checkoutApi.get).toHaveBeenCalledTimes(calls);
    expect(calls).toBeLessThanOrEqual(42);
  });
});
