import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, REFRESH_STORAGE_KEY, useAuth } from '@/features/auth';
import { authApi } from '@/features/auth/api';
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

const api = vi.mocked(authApi);

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
});
