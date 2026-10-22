import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppNav } from '@/components/layout/app-nav';
import { MyBookings } from '@/features/bookings';
import { bookingsApi } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/schemas';
import { createQueryClient } from '@/lib/query-client';
import { setSearch } from '../auth/render';

vi.mock('@/features/bookings/api', () => ({ bookingsApi: { mine: vi.fn() } }));
vi.mock('@/features/auth', () => ({
  canBookOnline: (p: readonly string[]) => !p.includes('BOOKING:ReadAny'),
  usePermissions: vi.fn(),
}));
vi.mock('next/navigation', async () => {
  const nav = (await import('../auth/render')).navigationMock;
  return { ...nav, usePathname: () => '/bookings' };
});

import { usePermissions } from '@/features/auth';

const mine = vi.mocked(bookingsApi).mine;

function booking(id: number, over: Partial<Booking> = {}): Booking {
  return {
    id,
    reference_code: `PK-${id}`,
    court_id: 7,
    venue_id: 3,
    court_name: 'Court 2',
    venue_name: 'Riverside',
    type: 'PLAYER_BOOKING',
    booking_status: 'CONFIRMED',
    payment_status: 'PAID',
    display_status: 'CONFIRMED',
    starts_at: '2026-10-23T10:00:00Z',
    ends_at: '2026-10-23T12:00:00Z',
    hours: 2,
    slots: [],
    price_centavos: 130000,
    fee_centavos: 2000,
    total_centavos: 132000,
    payment_method: 'ONLINE',
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: '2026-10-22T10:00:00Z',
    ...over,
  };
}

function page(data: Booking[], pageNo: number, has_more: boolean) {
  return { data, total: 3, page: pageNo, limit: 20, has_more };
}

function renderMine() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MyBookings />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('');
});

describe('MyBookings', () => {
  it('renders names, Manila times and the server status', async () => {
    mine.mockResolvedValue(
      page(
        [booking(1), booking(2, { display_status: 'IN_PROGRESS', reference_code: 'PK-LIVE' })],
        1,
        false,
      ),
    );
    renderMine();
    expect(await screen.findAllByText('Riverside · Court 2')).toHaveLength(2);
    expect(screen.getAllByText(/6 PM/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('₱1,320').length).toBeGreaterThan(0);
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('PK-LIVE')).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/bookings/1');
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('loads page 2 and appends', async () => {
    mine.mockImplementation(async (p) =>
      p === 1 ? page([booking(1)], 1, true) : page([booking(2)], 2, false),
    );
    renderMine();
    await userEvent.click(await screen.findByRole('button', { name: /load more/i }));
    expect(await screen.findByText('PK-2')).toBeInTheDocument();
    expect(screen.getByText('PK-1')).toBeInTheDocument();
    expect(mine).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('shows the empty state with a link to venues', async () => {
    mine.mockResolvedValue(page([], 1, false));
    renderMine();
    expect(await screen.findByText('No bookings yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /venues/i })).toHaveAttribute('href', '/venues');
  });

  it('shows the provider notice', async () => {
    setSearch('notice=provider');
    mine.mockResolvedValue(page([booking(1)], 1, false));
    renderMine();
    expect(
      await screen.findByText(
        'Your hold is saved, but the payment page is unavailable. Open it below to try again.',
      ),
    ).toBeInTheDocument();
  });
});

describe('AppNav', () => {
  function nav(perms: string[] | undefined) {
    vi.mocked(usePermissions).mockReturnValue({ data: perms } as ReturnType<typeof usePermissions>);
    return render(<AppNav />);
  }

  it('shows player links and marks the active one', () => {
    nav([]);
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute('href', '/venues');
    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Venues' })).not.toHaveAttribute('aria-current');
  });

  it('is hidden for staff', () => {
    const { container } = nav(['BOOKING:ReadAny']);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden until permissions load', () => {
    const { container } = nav(undefined);
    expect(container).toBeEmptyDOMElement();
  });
});
