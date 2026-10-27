import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutApi } from '@/features/booking/api';
import { formatCountdown } from '@/features/booking/hooks/use-seconds-left';
import { HoldPage } from '@/features/booking/components/hold-page';
import { goToMaya } from '@/features/booking/redirect';
import { renderWithAuth, router } from '../auth/render';
import { checkoutFixture } from './fixtures';

vi.mock('@/features/booking/api', () => ({
  checkoutApi: { get: vi.fn(), pay: vi.fn(), cancel: vi.fn() },
}));
vi.mock('@/features/booking/redirect', () => ({ goToMaya: vi.fn() }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const NOW = Date.parse('2026-10-28T02:00:08Z');

function held(secondsLeft: number, over = {}) {
  return checkoutFixture({
    created_at: new Date(NOW - (300 - secondsLeft) * 1000).toISOString(),
    expires_at: new Date(NOW + secondsLeft * 1000).toISOString(),
    ...over,
  });
}

function show() {
  return renderWithAuth(<HoldPage id={1} />, {
    status: 'authenticated',
    user: { is_customer: true } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW });
});
afterEach(() => vi.useRealTimers());

describe('formatCountdown', () => {
  it('reads minutes and padded seconds', () => {
    expect(formatCountdown(292)).toBe('4:52');
    expect(formatCountdown(5)).toBe('0:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('HoldPage', () => {
  it('counts down and lists every court by day with the fee and total', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(held(292));
    show();

    expect(await screen.findByRole('heading', { name: 'Pay within 4:52' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Pay within 5 minutes. After that the hours reopen for everyone, and a late payment is voided.',
      ),
    ).toBeInTheDocument();
    const thursday = screen.getByRole('list', { name: 'Thursday, 29 October' });
    expect(within(thursday).getByText('Court 1 · 10 AM – 12 PM')).toBeInTheDocument();
    expect(within(thursday).getByText('₱1,000')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Friday, 30 October' })).toBeInTheDocument();
    expect(screen.getByText('Convenience fee').nextSibling).toHaveTextContent('₱45');
    expect(screen.getByText('Total').nextSibling).toHaveTextContent('₱1,545');
  });

  it('opens Maya on Continue', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(held(200));
    vi.mocked(checkoutApi.pay).mockResolvedValue(
      held(200, { checkout_url: 'http://maya.test/pay/abc' }),
    );
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to Maya' }));

    await waitFor(() => expect(goToMaya).toHaveBeenCalledWith('http://maya.test/pay/abc'));
    expect(checkoutApi.pay).toHaveBeenCalledWith(1);
  });

  it('releases the hours on Cancel and shows the result', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(held(200));
    vi.mocked(checkoutApi.cancel).mockResolvedValue(held(200, { status: 'CANCELLED' }));
    show();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel and release hours' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/book/result/1'));
  });

  it('disables both buttons once the hold ends', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(held(2));
    show();
    await screen.findByRole('heading', { name: 'Pay within 0:02' });

    vi.advanceTimersByTime(3_000);

    expect(
      await screen.findByText('Your hold ended. These hours are open to everyone again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Maya' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel and release hours' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Book again' })).toHaveAttribute('href', '/book/3');
  });

  it('sends a checkout that is no longer pending to its result', async () => {
    vi.mocked(checkoutApi.get).mockResolvedValue(held(200, { status: 'SUCCESSFUL' }));
    show();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book/result/1'));
  });
});
