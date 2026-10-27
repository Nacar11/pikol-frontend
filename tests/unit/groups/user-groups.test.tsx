import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { UserGroups } from '@/features/groups';
import { staffApi } from '@/features/staff/api';
import { renderWithAuth } from '../auth/render';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
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
  usePathname: () => '/staff/groups',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const OWNER = [
  'BOOKING:ReadAny',
  'COURT:Manage',
  'USER:Manage',
  'VENUE:Manage',
  'PARAMETER:Manage',
];
const page = (data: unknown[]) => ({
  data,
  total: data.length,
  page: 1,
  limit: 200,
  has_more: false,
});
const customers = {
  id: 1,
  name: 'Customer',
  kind: 'CUSTOMER',
  venue_id: null,
  member_count: 1204,
  permissions: [],
  read_only: false,
};
const master = (id: number, venue_id: number) => ({
  id,
  name: 'Venue master',
  kind: 'MASTER',
  venue_id,
  member_count: 1,
  permissions: ['BOOKING:ReadAny', 'USER:Manage'],
  read_only: false,
});
const kim = {
  id: 5,
  email: 'kim@x.ph',
  first_name: 'Kim',
  last_name: 'Tan',
  mobile: null,
  is_active: true,
  email_verified_at: '2026-10-01T00:00:00Z',
  groups: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authApi.permissions).mockResolvedValue(OWNER);
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 2, name: 'Riverside', is_master: true, groups: [] },
    { venue_id: 3, name: 'Lakeside', is_master: true, groups: [] },
  ]);
  http.get.mockImplementation((path: string, opts?: { params?: Record<string, unknown> }) => {
    if (path === '/admin/permissions') return Promise.resolve([]);
    if (path === '/admin/users') return Promise.resolve(page([kim]));
    if (path.endsWith('/members')) return Promise.resolve(page([]));
    if (opts?.params?.kind === 'CUSTOMER') return Promise.resolve(page([customers]));
    return Promise.resolve(page([master(10, 2), master(11, 3)]));
  });
});

describe('User groups (Masters)', () => {
  it('is not available to anyone without the owner-only code', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue(['BOOKING:ReadAny', 'USER:Manage']);
    renderWithAuth(<UserGroups />, { status: 'authenticated' });
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(http.get).not.toHaveBeenCalledWith('/admin/user-groups', expect.anything());
  });

  it('lists Customer, then each venue’s master group by venue name', async () => {
    renderWithAuth(<UserGroups />, { status: 'authenticated' });
    const list = await screen.findByRole('listbox', { name: 'Customer and venue master groups' });
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual([
        expect.stringContaining('Customer'),
        expect.stringContaining('Venue master · Riverside'),
        expect.stringContaining('Venue master · Lakeside'),
      ]),
    );
  });

  it('filters the list by venue', async () => {
    renderWithAuth(<UserGroups />, { status: 'authenticated' });
    const list = await screen.findByRole('listbox', { name: 'Customer and venue master groups' });
    await userEvent.type(screen.getByLabelText('Filter groups'), 'lake');
    expect(within(list).getAllByRole('option')).toHaveLength(1);
  });

  it('makes someone a customer from a name search', async () => {
    http.post.mockResolvedValue({
      user_id: 5,
      email: 'kim@x.ph',
      first_name: 'Kim',
      last_name: 'Tan',
      is_active: true,
      pending_invite: false,
      is_customer: true,
      added_at: '2026-10-27T00:00:00Z',
    });
    renderWithAuth(<UserGroups />, { status: 'authenticated' });
    expect(
      await screen.findByText('Customers can book and pay in the mobile app.'),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Find a person'), 'kim');
    await userEvent.click(await screen.findByRole('button', { name: 'Add Kim Tan to customers' }));

    expect(http.get).toHaveBeenCalledWith('/admin/users', { params: { q: 'kim', limit: 20 } });
    expect(http.post).toHaveBeenCalledWith('/admin/user-groups/1/members', { email: 'kim@x.ph' });
    expect(
      await screen.findByRole('button', { name: 'Remove Kim Tan from customers' }),
    ).toBeInTheDocument();
  });

  it('lets the owner edit a master group’s permissions', async () => {
    renderWithAuth(<UserGroups />, { status: 'authenticated' });
    const list = await screen.findByRole('listbox', { name: 'Customer and venue master groups' });
    await userEvent.click(await within(list).findByRole('option', { name: /Riverside/ }));

    expect(
      await screen.findByRole('heading', { name: 'Venue master · Riverside' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save permissions' })).toBeInTheDocument();
  });
});
