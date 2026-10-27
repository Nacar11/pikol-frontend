import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/api';
import { VenueStaff } from '@/features/groups';
import { staffApi } from '@/features/staff/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth } from '../auth/render';

// The network edge: the real groupsApi runs against this fake HTTP client.
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
  usePathname: () => '/staff/venue-staff',
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MASTER_CODES = [
  'BOOKING:CancelAny',
  'BOOKING:CreateWalkIn',
  'BOOKING:MarkPaid',
  'BOOKING:ReadAny',
  'BOOKING:SetOutcome',
  'CLOSURE:Manage',
  'COURT:Manage',
  'PRICE:Manage',
  'USER:Manage',
];
const CATALOGUE = [...MASTER_CODES, 'VENUE:Manage', 'PARAMETER:Manage'].map((code) => ({
  code,
  resource: code.split(':')[0],
  action: code.split(':')[1],
  description: null,
  owner_only: code === 'VENUE:Manage' || code === 'PARAMETER:Manage',
}));
const group = (id: number, name: string, over: object = {}) => ({
  id,
  name,
  kind: 'STAFF',
  venue_id: 2,
  member_count: 0,
  permissions: ['BOOKING:ReadAny'],
  read_only: false,
  ...over,
});
let groups: ReturnType<typeof group>[];
let members: unknown[];

function page(data: unknown[]) {
  return { data, total: data.length, page: 1, limit: 200, has_more: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  groups = [
    group(10, 'Venue master', {
      kind: 'MASTER',
      read_only: true,
      permissions: MASTER_CODES,
      member_count: 1,
    }),
    group(11, 'Front desk', { member_count: 2 }),
    group(12, 'Weekend crew'),
  ];
  members = [];
  vi.mocked(authApi.permissions).mockResolvedValue(MASTER_CODES);
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 2, name: 'Riverside', is_master: true, groups: ['Venue master'] },
  ]);
  http.get.mockImplementation((path: string) => {
    if (path === '/admin/permissions') return Promise.resolve(CATALOGUE);
    if (path.endsWith('/members')) return Promise.resolve(page(members));
    return Promise.resolve(page(groups));
  });
});

async function open() {
  renderWithAuth(<VenueStaff />, { status: 'authenticated' });
  return screen.findByRole('listbox', { name: 'Groups at this venue' });
}

describe('Venue staff', () => {
  it('lists the venue’s groups, the master group first and read-only', async () => {
    const list = await open();
    const options = within(list).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Venue master'),
      expect.stringContaining('Front desk'),
      expect.stringContaining('Weekend crew'),
    ]);
    expect(within(options[0]!).getByText('Managed by the owner')).toBeInTheDocument();
    expect(await screen.findByText(/The owner manages this group/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Manage courts/ })).toBeDisabled();
  });

  it('moves through the list with the keyboard and opens with Enter', async () => {
    const list = await open();
    const [first, second] = within(list).getAllByRole('option');
    first!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Front desk' })).toBeInTheDocument();
  });

  it('never offers the owner-only codes', async () => {
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));

    const venues = await screen.findByRole('checkbox', { name: /Manage venues/ });
    expect(venues).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Manage parameters/ })).toBeDisabled();
    expect(screen.getAllByText('Super admin only')).toHaveLength(2);
  });

  it('saves the whole checkbox state, and shows the server’s answer', async () => {
    http.put.mockResolvedValue(
      group(11, 'Front desk', {
        member_count: 2,
        permissions: ['BOOKING:ReadAny', 'COURT:Manage'],
      }),
    );
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Manage courts/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    expect(http.put).toHaveBeenCalledWith('/admin/user-groups/11/permissions', {
      codes: ['BOOKING:ReadAny', 'COURT:Manage'],
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('keeps the form dirty with the message when the server refuses', async () => {
    http.put.mockRejectedValue(
      new ApiError(409, {
        detail: 'That would remove your own access to manage groups here.',
        code: 'SELF_LOCKOUT',
        request_id: 'r',
      }),
    );
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /See all bookings/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('remove your own access');
    expect(screen.getByRole('checkbox', { name: /See all bookings/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });

  it('asks before switching groups with unsaved changes', async () => {
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Manage courts/ }));

    await userEvent.click(within(list).getByRole('option', { name: /Weekend crew/ }));
    expect(screen.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Front desk' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Discard and switch' }));
    expect(await screen.findByRole('heading', { name: 'Weekend crew' })).toBeInTheDocument();
  });

  it('cannot delete a group that still has members, and says why', async () => {
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));

    expect(await screen.findByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByText('Move its members out first.')).toBeInTheDocument();
  });

  it('deletes an empty group after confirming', async () => {
    http.delete.mockResolvedValue(undefined);
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Weekend crew/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Delete group' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(http.delete).toHaveBeenCalledWith('/admin/user-groups/12');
  });

  it('adds a member by exact email, and explains a miss', async () => {
    http.post.mockRejectedValueOnce(
      new ApiError(404, {
        detail: 'No account with that email.',
        code: 'NOT_FOUND',
        request_id: 'r',
      }),
    );
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    await userEvent.click(await screen.findByRole('tab', { name: /Members/ }));
    await userEvent.type(screen.getByLabelText('Add by email'), 'kim@x.ph');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(http.post).toHaveBeenCalledWith('/admin/user-groups/11/members', { email: 'kim@x.ph' });
    expect(await screen.findByRole('alert')).toHaveTextContent('No account with that email.');
  });

  it('marks members who are also customers and confirms a removal', async () => {
    members = [
      {
        user_id: 5,
        email: 'kim@x.ph',
        first_name: 'Kim',
        last_name: 'Tan',
        is_active: true,
        pending_invite: false,
        is_customer: true,
        added_at: '2026-10-01T00:00:00Z',
      },
    ];
    http.delete.mockResolvedValue(undefined);
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    await userEvent.click(await screen.findByRole('tab', { name: /Members/ }));

    expect(await screen.findByText(/also a customer/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Kim Tan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(http.delete).toHaveBeenCalledWith('/admin/user-groups/11/members/5');
  });

  it('switches tabs with the arrow keys', async () => {
    const list = await open();
    await userEvent.click(within(list).getByRole('option', { name: /Front desk/ }));
    const permissions = await screen.findByRole('tab', { name: /Permissions/ });
    permissions.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Members/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('creates a group at the venue without naming it — the server decides', async () => {
    http.post.mockResolvedValue(group(13, 'Cashier'));
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    await userEvent.type(screen.getByLabelText('New group name'), 'Cashier');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(http.post).toHaveBeenCalledWith('/admin/user-groups', { name: 'Cashier' });
  });
});
