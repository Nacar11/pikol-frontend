import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { StaffShell } from '@/features/staff';
import { staffApi } from '@/features/staff/api';
import { renderWithAuth, router, setSearch } from '../auth/render';

vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/closures',
}));

const FRONT_DESK = [
  'BOOKING:ReadAny',
  'BOOKING:CreateWalkIn',
  'BOOKING:MarkPaid',
  'BOOKING:SetOutcome',
  'BOOKING:CancelAny',
  'CLOSURE:Manage',
];
const OWNER = [
  ...FRONT_DESK,
  'COURT:Manage',
  'PRICE:Manage',
  'USER:Manage',
  'VENUE:Manage',
  'PARAMETER:Manage',
];
const ana = { id: 1, first_name: 'Ana', last_name: 'Lim' } as never;

const logout = vi.fn(async () => undefined);

function setup(permissions: string[], badges = {}) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions);
  renderWithAuth(
    <StaffShell badges={badges}>
      <p>page body</p>
    </StaffShell>,
    { status: 'authenticated', user: ana, logout },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  setSearch('');
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 2, name: 'Riverside', is_master: false, groups: ['Front desk'] },
  ]);
});

describe('StaffShell', () => {
  it('shows only the links held at the active venue, and no empty section', async () => {
    setup(FRONT_DESK);
    const nav = await screen.findByRole('navigation', { name: 'Staff' });

    await within(nav).findByRole('link', { name: 'Schedule' });
    expect(within(nav).getByText('Operations')).toBeInTheDocument();
    expect(within(nav).queryByText('Setup')).not.toBeInTheDocument();
    expect(within(nav).queryByText('Masters')).not.toBeInTheDocument();
    for (const hidden of ['Courts', 'Venue staff', 'Staff accounts', 'Venues', 'Parameters']) {
      expect(within(nav).queryByRole('link', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('marks the current page and groups every link in section order', async () => {
    setup(OWNER);
    const nav = await screen.findByRole('navigation', { name: 'Staff' });
    await within(nav).findByRole('link', { name: 'Courts' });

    expect(within(nav).getByRole('link', { name: 'Closures' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([
      'Schedule',
      'To resolve',
      'Closures',
      'Courts',
      'Venue staff',
      'Staff accounts',
      'Venues',
      'Parameters',
      'User groups',
    ]);
  });

  it('renders a passed-in badge beside its link', async () => {
    setup(FRONT_DESK, { '/staff/resolution': <span>3</span> });

    const link = await screen.findByRole('link', { name: /To resolve/ });
    expect(link).toHaveTextContent('To resolve3');
  });

  it('names the signed-in person with their groups at the venue, or Super admin', async () => {
    setup(FRONT_DESK);
    expect(await screen.findByText('Ana Lim')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Front desk').length).toBeGreaterThan(0));
  });

  it('calls the owner Super admin, from the owner-only code', async () => {
    setup(OWNER);
    expect(await screen.findByText('Super admin')).toBeInTheDocument();
  });

  it('opens the mobile drawer and closes it with Escape', async () => {
    const u = userEvent.setup();
    setup(FRONT_DESK);
    const open = await screen.findByRole('button', { name: 'Open navigation' });

    await u.click(open);
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await u.keyboard('{Escape}');

    expect(open).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses to a rail that keeps every link name, and remembers it', async () => {
    const u = userEvent.setup();
    setup(FRONT_DESK);
    const collapse = await screen.findByRole('button', { name: 'Collapse sidebar' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');

    await u.click(collapse);

    const expand = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(window.localStorage.getItem('pikol:staff_sidebar')).toBe('collapsed');
    const nav = screen.getByRole('navigation', { name: 'Staff' });
    expect(within(nav).getByRole('link', { name: 'Schedule' })).toHaveAttribute(
      'title',
      'Schedule',
    );
  });

  it('opens collapsed when this browser last chose it', async () => {
    window.localStorage.setItem('pikol:staff_sidebar', 'collapsed');
    setup(FRONT_DESK);
    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('offers a skip link to the page body', async () => {
    setup(FRONT_DESK);
    expect(await screen.findByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#staff-main',
    );
  });

  it('signs out from the top bar, not the sidebar, and returns to the staff door', async () => {
    const u = userEvent.setup();
    setup(FRONT_DESK);
    const bar = await screen.findByRole('banner');
    const sidebar = screen.getByRole('complementary', { name: 'Staff navigation' });

    expect(within(sidebar).queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(within(bar).getByText('Ana Lim')).toBeInTheDocument();
    await u.click(within(bar).getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalled();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });
});
