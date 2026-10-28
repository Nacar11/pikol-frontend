import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestGate } from '@/features/auth';
import { authApi } from '@/features/auth/api';
import { renderWithAuth, router, setPathname } from './render';

vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('./render')).navigationMock);

const api = vi.mocked(authApi);
const signedIn = (is_customer: boolean) => ({
  status: 'authenticated' as const,
  user: { is_customer } as never,
});

describe('GuestGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPathname('/');
  });

  it('shows the form to a signed-out visitor', () => {
    renderWithAuth(<GuestGate>form</GuestGate>);
    expect(screen.getByText('form')).toBeInTheDocument();
  });

  it('sends a signed-in customer at the customer door to /book, even one who is staff', async () => {
    setPathname('/customer-login-demo');
    api.permissions.mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<GuestGate>form</GuestGate>, signedIn(true));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book'));
    expect(router.replace).not.toHaveBeenCalledWith('/staff/schedule');
  });

  it('sends a signed-in staff member at the staff door to the console', async () => {
    setPathname('/login');
    api.permissions.mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<GuestGate>form</GuestGate>, signedIn(true));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/staff/schedule'));
  });

  it('honours a safe ?next= over the door home, never an off-site one', async () => {
    setPathname('/customer-login-demo');
    window.history.replaceState(null, '', '/customer-login-demo?next=%2Fbook%2Fmine');
    renderWithAuth(<GuestGate>form</GuestGate>, signedIn(true));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book/mine'));

    router.replace.mockClear();
    window.history.replaceState(null, '', '/customer-login-demo?next=%2F%2Fevil.example');
    renderWithAuth(<GuestGate>form</GuestGate>, signedIn(true));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book'));
    expect(router.replace).not.toHaveBeenCalledWith('//evil.example');
    window.history.replaceState(null, '', '/');
  });
});
