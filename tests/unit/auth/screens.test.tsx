import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { AcceptInviteForm } from '@/features/auth/components/accept-invite-form';
import { LoginForm } from '@/features/auth/components/login-form';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { VerifyEmail } from '@/features/auth/components/verify-email';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth, router, setSearch } from './render';

vi.mock('@/features/auth/api', () => ({
  authApi: {
    permissions: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(async () => undefined),
    forgotPassword: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
    acceptInvitation: vi.fn(async () => undefined),
  },
}));
vi.mock('next/navigation', async () => (await import('./render')).navigationMock);
vi.mock('@/components/ui/snackbar', () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const api = vi.mocked(authApi);

const USER = {
  id: 1,
  email: 'jane@x.com',
  first_name: 'Jane',
  last_name: 'Doe',
  mobile: null,
  groups: [{ id: 1, name: 'Customer', kind: 'CUSTOMER' as const, venue_id: null }],
  is_customer: true,
  is_active: false,
  email_verified_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('');
});

async function fillLogin(email = 'jane@x.com', password = 'correct-horse-1') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('signs in and lands staff who are not customers on the console', async () => {
    const login = vi.fn(async () => ({ ...USER, is_customer: false }));
    api.permissions.mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<LoginForm />, { login });

    await fillLogin();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/staff/schedule'));
    expect(login).toHaveBeenCalledWith({ email: 'jane@x.com', password: 'correct-horse-1' });
  });

  it('lands a customer on the booking home, even one who is also staff', async () => {
    api.permissions.mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<LoginForm />, { login: vi.fn(async () => USER) });

    await fillLogin();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book'));
  });

  it('returns to a safe ?next= path, but never off-site', async () => {
    api.permissions.mockResolvedValue([]);
    setSearch('next=/staff/courts');
    const { unmount } = renderWithAuth(<LoginForm />, { login: vi.fn(async () => USER) });
    await fillLogin();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/staff/courts'));
    unmount();

    router.replace.mockClear();
    setSearch('next=//evil.example');
    renderWithAuth(<LoginForm />, { login: vi.fn(async () => USER) });
    await fillLogin();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book'));
  });

  it("shows the backend's message on bad credentials", async () => {
    const login = vi.fn(async () => {
      throw new ApiError(401, {
        detail: 'Incorrect email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    });
    renderWithAuth(<LoginForm />, { login });

    await fillLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument();
  });

  it('offers a resend when the email is not verified', async () => {
    const login = vi.fn(async () => {
      throw new ApiError(403, { detail: 'Verify your email.', code: 'EMAIL_NOT_VERIFIED' });
    });
    renderWithAuth(<LoginForm />, { login });

    await fillLogin();
    await userEvent.click(await screen.findByRole('button', { name: /resend/i }));

    expect(api.resendVerification).toHaveBeenCalledWith('jane@x.com');
  });

  it('validates before calling the API', async () => {
    const login = vi.fn();
    renderWithAuth(<LoginForm />, { login });

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});

describe('LoginForm without sign-up', () => {
  it('offers no way to create an account — customers register in the mobile app', () => {
    renderWithAuth(<LoginForm />);
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument();
  });
});

describe('VerifyEmail', () => {
  it('verifies the token from the URL exactly once', async () => {
    setSearch('token=abc');
    api.verifyEmail.mockResolvedValue(undefined);

    renderWithAuth(<VerifyEmail />);

    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    expect(api.verifyEmail).toHaveBeenCalledTimes(1);
    expect(api.verifyEmail).toHaveBeenCalledWith('abc');
  });

  it('offers a fresh link when this one is dead', async () => {
    setSearch('token=used');
    api.verifyEmail.mockRejectedValue(
      new ApiError(400, {
        detail: 'This link is invalid or has expired.',
        code: 'INVALID_OR_EXPIRED_LINK',
      }),
    );

    renderWithAuth(<VerifyEmail />);

    expect(await screen.findByText('This link is invalid or has expired.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'jane@x.com');
    await userEvent.click(screen.getByRole('button', { name: /send a new link/i }));
    expect(api.resendVerification).toHaveBeenCalledWith('jane@x.com');
  });
});

describe('token forms', () => {
  async function setPassword(button: string) {
    await userEvent.type(screen.getByLabelText('New password'), 'brand-new-pass-2');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'brand-new-pass-2');
    await userEvent.click(screen.getByRole('button', { name: button }));
  }

  it('reset submits the URL token and goes to login', async () => {
    setSearch('token=reset-1');
    renderWithAuth(<ResetPasswordForm />);

    await setPassword('Set new password');

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(api.resetPassword).toHaveBeenCalledWith('reset-1', 'brand-new-pass-2');
  });

  it('accepting an invitation sets the password and goes to login', async () => {
    setSearch('token=invite-1');
    renderWithAuth(<AcceptInviteForm />);

    await setPassword('Activate account');

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(api.acceptInvitation).toHaveBeenCalledWith('invite-1', 'brand-new-pass-2');
  });

  it('a missing token explains itself instead of showing a form', () => {
    renderWithAuth(<ResetPasswordForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(/link is missing/i);
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});
