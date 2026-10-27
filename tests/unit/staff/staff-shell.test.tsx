import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { StaffShell } from '@/features/staff';
import { staffApi } from '@/features/staff/api';
import { renderWithAuth, setSearch } from '../auth/render';

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

function setup(permissions: string[], badges = {}) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions);
  renderWithAuth(
    <StaffShell badges={badges}>
      <p>page body</p>
    </StaffShell>,
    { status: 'authenticated', user: ana },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
    for (const hidden of ['Courts', 'Venue staff', 'Staff', 'Venues', 'Parameters']) {
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
      'Staff',
      'Venues',
      'Parameters',
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

  it('offers a skip link to the page body', async () => {
    setup(FRONT_DESK);
    expect(await screen.findByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#staff-main',
    );
  });
});
