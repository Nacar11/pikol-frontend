import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/api';
import { TeamList } from '@/features/team';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth } from '../auth/render';

// The network edge: the real teamApi runs against this fake HTTP client.
const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  apiClient: () => http,
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type U = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  role: 'SUPER_ADMIN' | 'VENUE_MANAGER' | 'VENUE_STAFF' | 'PLAYER';
  venue_id: number | null;
  is_active: boolean;
  email_verified_at: string | null;
};
const person = (id: number, over: Partial<U> = {}): U => ({
  id,
  email: `p${id}@x.ph`,
  first_name: `First${id}`,
  last_name: `Last${id}`,
  mobile: null,
  role: 'VENUE_STAFF',
  venue_id: 1,
  is_active: true,
  email_verified_at: '2026-10-01T00:00:00Z',
  ...over,
});

let users: U[];
const venues = {
  data: [
    { id: 1, name: 'Riverside', address: null, is_active: true },
    { id: 2, name: 'Lakeside', address: null, is_active: true },
  ],
  total: 2,
  page: 1,
  limit: 100,
  has_more: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  users = [];
  // Reads always reflect the current server-side list.
  http.get.mockImplementation((path: string, opts?: { params?: { page?: number } }) => {
    if (path === '/venues') return Promise.resolve(venues);
    const pageNo = opts?.params?.page ?? 1;
    const size = 4;
    const slice = users.slice((pageNo - 1) * size, pageNo * size);
    return Promise.resolve({
      data: slice,
      total: users.length,
      page: pageNo,
      limit: size,
      has_more: pageNo * size < users.length,
    });
  });
});

const me = { id: 1, venue_id: 1, role: 'VENUE_MANAGER' } as never;
function setup(permissions: string[], user = me) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  renderWithAuth(<TeamList />, { status: 'authenticated', user });
}
const MANAGER = ['USER:Manage'];
const OWNER = ['USER:Manage', 'VENUE:Manage'];

async function fillInvite(u: ReturnType<typeof userEvent.setup>, mobile?: string) {
  await u.type(await screen.findByLabelText('Email'), 'new@x.ph');
  await u.type(screen.getByLabelText('First name'), 'Ana');
  await u.type(screen.getByLabelText('Last name'), 'Cruz');
  if (mobile) await u.type(screen.getByLabelText('Mobile (optional)'), mobile);
}

describe('TeamList', () => {
  it('shows "Not available" without USER:Manage', async () => {
    setup([]);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
  });

  it('renders role labels and statuses', async () => {
    users = [
      person(1, { role: 'VENUE_MANAGER' }),
      person(2, { email_verified_at: null }),
      person(3, { is_active: false }),
      person(4, { role: 'SUPER_ADMIN' }),
    ];
    setup(MANAGER);
    expect(await screen.findByText('First2 Last2')).toBeInTheDocument();
    expect(screen.getByText('Manager · Active')).toBeInTheDocument();
    expect(screen.getByText('Staff · Invited')).toBeInTheDocument();
    expect(screen.getByText('Staff · Deactivated')).toBeInTheDocument();
    expect(screen.getByText('Owner · Active')).toBeInTheDocument();
  });

  it('loads more pages', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2), person(3), person(4), person(5)];
    setup(MANAGER);
    await screen.findByText('First1 Last1');
    expect(screen.queryByText('First5 Last5')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('First5 Last5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('a manager invite posts exactly email, first_name, last_name to /admin/venue-staff', async () => {
    const u = userEvent.setup();
    users = [person(1, { role: 'VENUE_MANAGER' })];
    http.post.mockImplementation((_p: string, body: { email: string }) => {
      users.push(person(9, { email: body.email, email_verified_at: null }));
      return Promise.resolve(users[users.length - 1]);
    });
    setup(MANAGER);
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Venue')).not.toBeInTheDocument();
    await fillInvite(u);
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [path, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/admin/venue-staff');
    expect(Object.keys(body).sort()).toEqual(['email', 'first_name', 'last_name']);
    expect(toast.success).toHaveBeenCalledWith('Invitation sent to new@x.ph');
    expect(await screen.findByText('First9 Last9')).toBeInTheDocument();
  });

  it('includes mobile only when filled', async () => {
    const u = userEvent.setup();
    http.post.mockResolvedValue(person(9));
    setup(MANAGER);
    await fillInvite(u, '09171234567');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const body = http.post.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['email', 'first_name', 'last_name', 'mobile']);
  });

  it('an owner invite posts role and venue_id to /admin/users', async () => {
    const u = userEvent.setup();
    http.post.mockResolvedValue(person(9, { role: 'VENUE_MANAGER', venue_id: 2 }));
    setup(OWNER, { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never);
    await fillInvite(u);
    await u.selectOptions(screen.getByLabelText('Role'), 'VENUE_MANAGER');
    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeDisabled();
    await u.selectOptions(await screen.findByLabelText('Venue'), 'Lakeside');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [path, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/admin/users');
    expect(body).toEqual({
      email: 'new@x.ph',
      first_name: 'Ana',
      last_name: 'Cruz',
      role: 'VENUE_MANAGER',
      venue_id: 2,
    });
  });

  it('renders the server detail when the email is taken (409)', async () => {
    const u = userEvent.setup();
    http.post.mockRejectedValue(
      new ApiError(409, { detail: 'That email is already registered.', code: 'EMAIL_TAKEN' }),
    );
    setup(MANAGER);
    await fillInvite(u);
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('That email is already registered.')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('an invited row offers Resend and Revoke, and Revoke calls DELETE', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2, { email_verified_at: null })];
    http.delete.mockImplementation(() => {
      users = users.filter((x) => x.id !== 2);
      return Promise.resolve(undefined);
    });
    http.post.mockResolvedValue(undefined);
    setup(MANAGER);
    await screen.findByText('First2 Last2');
    await u.click(screen.getByRole('button', { name: /Resend/ }));
    expect(http.post).toHaveBeenCalledWith('/admin/users/2/invitation');
    await u.click(screen.getByRole('button', { name: /Revoke/ }));
    expect(http.delete).toHaveBeenCalledWith('/admin/users/2/invitation');
    await waitFor(() => expect(screen.queryByText('First2 Last2')).not.toBeInTheDocument());
  });

  it('a failed action followed by a successful one shows no stale error', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2), person(3, { email_verified_at: null })];
    http.patch.mockRejectedValue(
      new ApiError(409, { detail: 'Cannot deactivate.', code: 'CONFLICT', request_id: 'r' }),
    );
    http.post.mockResolvedValue(undefined);
    setup(MANAGER);
    await u.click(await screen.findByRole('button', { name: 'Deactivate First2 Last2' }));
    expect(await screen.findByText('Cannot deactivate.')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Resend/ }));
    expect(await screen.findByText('Invitation resent to p3@x.ph.')).toBeInTheDocument();
    expect(screen.queryByText('Cannot deactivate.')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Deactivate First2 Last2' }));
    await waitFor(() => expect(screen.queryByText(/Invitation resent/)).not.toBeInTheDocument());
  });

  it('ALREADY_ACCEPTED on resend refreshes the stale Invited row', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2, { email_verified_at: null })];
    http.post.mockImplementation(() => {
      users = users.map((x) => ({ ...x, email_verified_at: '2026-10-02T00:00:00Z' }));
      return Promise.reject(
        new ApiError(409, {
          detail: 'Already accepted.',
          code: 'ALREADY_ACCEPTED',
          request_id: 'r',
        }),
      );
    });
    setup(MANAGER);
    await u.click(await screen.findByRole('button', { name: /Resend/ }));
    expect(await screen.findByText('Already accepted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Resend/ })).toBeNull());
    expect(screen.queryByText(/Invited/)).not.toBeInTheDocument();
  });

  it('deactivate patches is_active false, then offers Reactivate', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2)];
    http.patch.mockImplementation(() => {
      users = users.map((x) => (x.id === 2 ? { ...x, is_active: false } : x));
      return Promise.resolve(users[1]);
    });
    setup(MANAGER);
    await u.click(await screen.findByRole('button', { name: 'Deactivate First2 Last2' }));
    expect(http.patch).toHaveBeenCalledWith('/admin/users/2', { is_active: false });
    expect(
      await screen.findByRole('button', { name: 'Reactivate First2 Last2' }),
    ).toBeInTheDocument();
  });

  it('your own row has no deactivate', async () => {
    users = [person(1), person(2)];
    setup(MANAGER);
    await screen.findByText('First1 Last1');
    expect(screen.queryByRole('button', { name: 'Deactivate First1 Last1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate First2 Last2' })).toBeInTheDocument();
  });
});
