import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/api';
import { staffApi } from '@/features/staff/api';
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
vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/users',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type U = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  groups: {
    id: number;
    name: string;
    kind: 'CUSTOMER' | 'MASTER' | 'STAFF';
    venue_id: number | null;
  }[];
};
const FRONT_DESK = { id: 11, name: 'Front desk', kind: 'STAFF' as const, venue_id: 1 };
const MASTERS = { id: 10, name: 'Venue master', kind: 'MASTER' as const, venue_id: 1 };
const CUSTOMER = { id: 1, name: 'Customer', kind: 'CUSTOMER' as const, venue_id: null };
const person = (id: number, over: Partial<U> = {}): U => ({
  id,
  email: `p${id}@x.ph`,
  first_name: `First${id}`,
  last_name: `Last${id}`,
  mobile: null,
  is_active: true,
  email_verified_at: '2026-10-01T00:00:00Z',
  groups: [FRONT_DESK],
  ...over,
});

let users: U[];
const groupRow = (id: number, name: string, kind: 'MASTER' | 'STAFF') => ({
  id,
  name,
  kind,
  venue_id: 1,
  member_count: 0,
  permissions: [],
  read_only: kind === 'MASTER',
});
const venueGroups = {
  data: [groupRow(10, 'Venue master', 'MASTER'), groupRow(11, 'Front desk', 'STAFF')],
  total: 2,
  page: 1,
  limit: 200,
  has_more: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  users = [];
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 1, name: 'Riverside', is_master: true, groups: ['Venue master'] },
  ]);
  // Reads always reflect the current server-side list.
  http.get.mockImplementation((path: string, opts?: { params?: { page?: number } }) => {
    if (path === '/admin/user-groups') return Promise.resolve(venueGroups);
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

const me = { id: 1 } as never;
function setup(permissions: string[], user = me) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  renderWithAuth(<TeamList />, { status: 'authenticated', user });
}
const MANAGER = ['USER:Manage'];
const OWNER = ['USER:Manage', 'VENUE:Manage'];

async function fillInvite(u: ReturnType<typeof userEvent.setup>, mobile?: string) {
  await u.click(await screen.findByRole('button', { name: 'Invite staff' }));
  await u.type(screen.getByLabelText('Email'), 'new@x.ph');
  await u.type(screen.getByLabelText('First name'), 'Ana');
  await u.type(screen.getByLabelText('Last name'), 'Cruz');
  if (mobile) await u.type(screen.getByLabelText('Mobile (optional)'), mobile);
}

describe('TeamList', () => {
  it('shows "Not available" without USER:Manage', async () => {
    setup([]);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
  });

  it('renders each person’s staff groups and status', async () => {
    users = [
      person(1, { groups: [MASTERS] }),
      person(2, { email_verified_at: null }),
      person(3, { is_active: false, groups: [CUSTOMER, FRONT_DESK] }),
      person(4, { groups: [CUSTOMER] }),
    ];
    setup(MANAGER);
    expect(await screen.findByText('First2 Last2')).toBeInTheDocument();
    expect(screen.getByText('Venue master · Active')).toBeInTheDocument();
    expect(screen.getByText('Front desk · Invited')).toBeInTheDocument();
    expect(screen.getByText('Front desk · Deactivated')).toBeInTheDocument();
    expect(screen.getByText('No staff group · Active')).toBeInTheDocument();
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

  it('a manager invites into a staff group at /admin/venue-staff — no venue, no role', async () => {
    const u = userEvent.setup();
    users = [person(1, { groups: [MASTERS] })];
    http.post.mockImplementation((_p: string, body: { email: string }) => {
      users.push(person(9, { email: body.email, email_verified_at: null }));
      return Promise.resolve(users[users.length - 1]);
    });
    setup(MANAGER);
    await fillInvite(u);
    const group = screen.getByLabelText('Group at Riverside');
    // A manager is never offered the master group.
    await waitFor(() => expect(within(group).getAllByRole('option')).toHaveLength(2));
    expect(within(group).queryByRole('option', { name: 'Venue master' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeDisabled();
    await u.selectOptions(group, 'Front desk');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [path, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/admin/venue-staff');
    expect(body).toEqual({ email: 'new@x.ph', first_name: 'Ana', last_name: 'Cruz', group_id: 11 });
    expect(toast.success).toHaveBeenCalledWith('Invitation sent to new@x.ph');
    expect(await screen.findByText('First9 Last9')).toBeInTheDocument();
  });

  it('includes mobile only when filled', async () => {
    const u = userEvent.setup();
    http.post.mockResolvedValue(person(9));
    setup(MANAGER);
    await fillInvite(u, '09171234567');
    await u.selectOptions(screen.getByLabelText('Group at Riverside'), 'Front desk');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const body = http.post.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      'email',
      'first_name',
      'group_id',
      'last_name',
      'mobile',
    ]);
  });

  it('the owner may invite a venue master, through /admin/users', async () => {
    const u = userEvent.setup();
    http.post.mockResolvedValue(person(9, { groups: [MASTERS] }));
    setup(OWNER);
    await fillInvite(u);
    await u.selectOptions(screen.getByLabelText('Group at Riverside'), 'Venue master');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    const [path, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/admin/users');
    expect(body).toEqual({ email: 'new@x.ph', first_name: 'Ana', last_name: 'Cruz', group_id: 10 });
  });

  it('points an already-registered email at Venue staff', async () => {
    const u = userEvent.setup();
    http.post.mockRejectedValue(
      new ApiError(409, {
        detail: 'Already registered — add them from Venue staff.',
        code: 'EMAIL_EXISTS',
      }),
    );
    setup(MANAGER);
    await fillInvite(u);
    await u.selectOptions(screen.getByLabelText('Group at Riverside'), 'Front desk');
    await u.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByRole('link', { name: 'add them from Venue staff' })).toHaveAttribute(
      'href',
      '/staff/venue-staff',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
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
    expect(within(screen.getByRole('table')).queryByText(/Invited/)).not.toBeInTheDocument();
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

  it('searches by name or email on the server', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2)];
    setup(MANAGER);
    await screen.findByText('First1 Last1');
    await u.type(screen.getByLabelText('Search name or email'), 'ana');
    await waitFor(() =>
      expect(http.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 1, limit: 20, q: 'ana' },
      }),
    );
  });

  it('filters by status, with counts once every page is loaded', async () => {
    const u = userEvent.setup();
    users = [person(1), person(2, { email_verified_at: null }), person(3, { is_active: false })];
    setup(MANAGER);
    await screen.findByText('First1 Last1');
    expect(screen.getByText('1 active')).toBeInTheDocument();
    const invited = screen.getByRole('button', { name: 'Invited 1' });
    await u.click(invited);
    expect(invited).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('First2 Last2')).toBeInTheDocument();
    expect(screen.queryByText('First1 Last1')).not.toBeInTheDocument();
    expect(screen.queryByText('First3 Last3')).not.toBeInTheDocument();
  });

  it('your own row has no deactivate', async () => {
    users = [person(1), person(2)];
    setup(MANAGER);
    await screen.findByText('First1 Last1');
    expect(screen.queryByRole('button', { name: 'Deactivate First1 Last1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate First2 Last2' })).toBeInTheDocument();
  });
});
