import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/features/auth';
import { REFRESH_STORAGE_KEY } from '@/features/auth/auth-provider';
import { authApi } from '@/features/auth/api';
import { errorCode } from '@/lib/api-error';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@/features/auth/api', () => ({
  authApi: {
    login: vi.fn(),
    customerLogin: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(async () => undefined),
    me: vi.fn(),
    permissions: vi.fn(async () => []),
  },
}));

vi.mock('next/navigation', async () => (await import('./render')).navigationMock);

const api = vi.mocked(authApi);
/** Stands in for any per-user read: what the signed-in person last saw. */
const mine = vi.fn<() => Promise<string>>();
const refused = vi.fn<(err: unknown) => void>();
const JANE = { email: 'jane@x.com', password: 'pw' };

const USER = {
  id: 1,
  email: 'jane@x.com',
  first_name: 'Jane',
  last_name: 'Doe',
  mobile: null,
  groups: [{ id: 1, name: 'Customer', kind: 'CUSTOMER' as const, venue_id: null }],
  is_customer: true,
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
      <button onClick={() => login(JANE, 'customer').catch(refused)}>login</button>
      <button onClick={() => login(JANE, 'staff').catch(refused)}>staff login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

/** A per-user read, mounted only while someone is signed in. */
function SignedInData() {
  const { status } = useAuth();
  return status === 'authenticated' ? <Data /> : null;
}

function Data() {
  const { data } = useQuery({ queryKey: ['mine'], queryFn: () => mine() });
  return data ? <p>{data}</p> : null;
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
    api.customerLogin.mockResolvedValue(PAIR);
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

  it("forgets the previous person's data on sign-out", async () => {
    api.customerLogin.mockResolvedValue(PAIR);
    api.me.mockResolvedValueOnce(USER).mockResolvedValueOnce({ ...USER, id: 2, first_name: 'Bob' });
    mine.mockResolvedValueOnce('PK-JANE').mockResolvedValueOnce('PK-BOB');
    render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <Probe />
          <SignedInData />
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

  it('signs a customer in through the customer door', async () => {
    api.customerLogin.mockResolvedValue(PAIR);
    api.me.mockResolvedValue(USER);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => screen.getByText('login').click());

    expect(api.customerLogin).toHaveBeenCalledWith(JANE);
    expect(api.login).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('stores nothing when the customer door refuses the account', async () => {
    api.customerLogin.mockRejectedValue(new Error('403 NOT_A_CUSTOMER'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
  });

  it('refuses a non-staff account at the staff door before signing in', async () => {
    api.login.mockResolvedValue(PAIR);
    api.permissions.mockResolvedValue([]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => screen.getByText('staff login').click());

    expect(errorCode(refused.mock.calls[0]?.[0])).toBe('NOT_STAFF');
    expect(api.logout).toHaveBeenCalled();
    expect(api.me).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBeNull();
  });

  it('signs staff in at the staff door', async () => {
    api.login.mockResolvedValue(PAIR);
    api.permissions.mockResolvedValue(['BOOKING:ReadAny']);
    api.me.mockResolvedValue({ ...USER, is_customer: false });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    await act(async () => screen.getByText('staff login').click());

    expect(refused).not.toHaveBeenCalled();
    expect(api.logout).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(window.localStorage.getItem(REFRESH_STORAGE_KEY)).toBe('r2');
  });
});
