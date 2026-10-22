import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, REFRESH_STORAGE_KEY, useAuth } from '@/features/auth';
import { authApi } from '@/features/auth/api';
import { MyBookings } from '@/features/bookings';
import { bookingsApi } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/schemas';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/auth/api', () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(async () => undefined),
    me: vi.fn(),
    permissions: vi.fn(async () => []),
  },
}));

vi.mock('@/features/bookings/api', () => ({ bookingsApi: { mine: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('./render')).navigationMock);

const api = vi.mocked(authApi);
const mine = vi.mocked(bookingsApi).mine;

const USER = {
  id: 1,
  email: 'jane@x.com',
  first_name: 'Jane',
  last_name: 'Doe',
  mobile: null,
  role: 'PLAYER' as const,
  venue_id: null,
  is_active: true,
  email_verified_at: '2026-10-21T00:00:00Z',
};
const PAIR = {
  access_token: 'a',
  refresh_token: 'r2',
  token_type: 'bearer' as const,
  expires_in: 900,
};

function Probe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="name">{user?.first_name ?? ''}</p>
      <button onClick={() => login({ email: 'jane@x.com', password: 'pw' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function booking(id: number, reference_code: string): Booking {
  return {
    id,
    reference_code,
    court_id: 7,
    venue_id: 3,
    court_name: 'Court 2',
    venue_name: 'Riverside',
    type: 'PLAYER_BOOKING',
    booking_status: 'CONFIRMED',
    payment_status: 'PAID',
    display_status: 'CONFIRMED',
    starts_at: '2026-10-23T10:00:00Z',
    ends_at: '2026-10-23T11:00:00Z',
    hours: 1,
    slots: [],
    price_centavos: 60000,
    fee_centavos: 1000,
    total_centavos: 61000,
    payment_method: 'ONLINE',
    expires_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: null,
    created_at: '2026-10-22T10:00:00Z',
  };
}

/** My bookings, mounted only while someone is signed in. */
function SignedInBookings() {
  const { status } = useAuth();
  return status === 'authenticated' ? <MyBookings /> : null;
}

function renderProvider() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is unauthenticated with no stored refresh token', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('restores a session from the stored refresh token, rotating it', async () => {
    window.localStorage.setItem(REFRESH_STORAGE_KEY, 'r1');
    api.refresh.mockResolvedValue(PAIR);
    api.me.mockResolvedValue(USER);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(api.refresh).toHaveBeenCalledWith('r1');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBe('r2');
    expect(screen.getByTestId('name')).toHaveTextContent('Jane');
  });

  it('drops a refresh token that no longer works', async () => {
    window.localStorage.setItem(REFRESH_STORAGE_KEY, 'revoked');
    api.refresh.mockRejectedValue(new Error('401'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
  });

  it('logs in, then loads the user; logs out and forgets the token', async () => {
    api.login.mockResolvedValue(PAIR);
    api.me.mockResolvedValue(USER);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => screen.getByText('login').click());
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBe('r2');

    await act(async () => screen.getByText('logout').click());
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
    expect(api.logout).toHaveBeenCalled();
  });

  it("forgets the previous player's bookings on sign-out", async () => {
    api.login.mockResolvedValue(PAIR);
    api.me.mockResolvedValueOnce(USER).mockResolvedValueOnce({ ...USER, id: 2, first_name: 'Bob' });
    mine
      .mockResolvedValueOnce({
        data: [booking(1, 'PK-JANE')],
        total: 1,
        page: 1,
        limit: 20,
        has_more: false,
      })
      .mockResolvedValueOnce({
        data: [booking(2, 'PK-BOB')],
        total: 1,
        page: 1,
        limit: 20,
        has_more: false,
      });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <Probe />
          <SignedInBookings />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => screen.getByText('login').click());
    expect(await screen.findByText('PK-JANE')).toBeInTheDocument();

    await act(async () => screen.getByText('logout').click());
    expect(screen.queryByText('PK-JANE')).not.toBeInTheDocument();

    await act(async () => screen.getByText('login').click());
    expect(screen.getByTestId('name')).toHaveTextContent('Bob');
    expect(screen.queryByText('PK-JANE')).not.toBeInTheDocument();
    expect(await screen.findByText('PK-BOB')).toBeInTheDocument();
    expect(mine).toHaveBeenCalledTimes(2);
  });
});
