import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutApi } from '@/features/booking/api';
import { MyBookings } from '@/features/booking/components/my-bookings';
import { goToMaya } from '@/features/booking/redirect';
import { renderWithAuth } from '../auth/render';
import { checkoutFixture } from './fixtures';

vi.mock('@/features/booking/api', () => ({ checkoutApi: { list: vi.fn(), pay: vi.fn() } }));
vi.mock('@/features/booking/redirect', () => ({ goToMaya: vi.fn() }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const page = (rows: unknown[]) => ({
  data: rows,
  total: rows.length,
  page: 1,
  limit: 20,
  has_more: false,
});

beforeEach(() => vi.clearAllMocks());

describe('MyBookings', () => {
  it('shows each status, and a countdown with Continue only while pending', async () => {
    const live = checkoutFixture({
      id: 1,
      reference_code: 'PKL-LIVE1',
      expires_at: new Date(Date.now() + 200_000).toISOString(),
    });
    const paid = checkoutFixture({ id: 2, reference_code: 'PKL-PAID2', status: 'SUCCESSFUL' });
    vi.mocked(checkoutApi.list).mockResolvedValue(page([live, paid]) as never);
    vi.mocked(checkoutApi.pay).mockResolvedValue({ ...live, checkout_url: 'http://maya/x' });
    renderWithAuth(<MyBookings />, {
      status: 'authenticated',
      user: { is_customer: true } as never,
    });

    const pending = (await screen.findByText('PKL-LIVE1')).closest('li') as HTMLElement;
    const done = screen.getByText('PKL-PAID2').closest('li') as HTMLElement;
    expect(within(pending).getByText('Pending')).toBeInTheDocument();
    expect(within(pending).getByText(/^3:[12]\d left$/)).toBeInTheDocument();
    expect(within(pending).getByText('3 hours · ₱1,545')).toBeInTheDocument();
    expect(within(done).getByText('Successful')).toBeInTheDocument();
    expect(within(done).queryByRole('button', { name: 'Continue to Maya' })).toBeNull();

    await userEvent.click(within(pending).getByRole('button', { name: 'Continue to Maya' }));
    await waitFor(() => expect(goToMaya).toHaveBeenCalledWith('http://maya/x'));
  });

  it('says so when there are no bookings yet', async () => {
    vi.mocked(checkoutApi.list).mockResolvedValue(page([]) as never);
    renderWithAuth(<MyBookings />, {
      status: 'authenticated',
      user: { is_customer: true } as never,
    });

    expect(await screen.findByText('No bookings yet.')).toBeInTheDocument();
  });
});
