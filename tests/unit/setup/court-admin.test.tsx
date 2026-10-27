import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { staffApi } from '@/features/staff/api';
import { catalogKeys } from '@/features/catalog/keys';
import { CourtAdmin } from '@/features/setup';
import { setupApi } from '@/features/setup/api';
import { setupKeys } from '@/features/setup/keys';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth, setSearch } from '../auth/render';

vi.mock('@/features/setup/api', () => ({
  setupApi: { courts: vi.fn(), createCourt: vi.fn(), updateCourt: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/courts',
}));

const api = vi.mocked(setupApi);
const owner = { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never;

type C = { id: number; venue_id: number; name: string; sort_order: number; is_active: boolean };
const court = (id: number, sort_order: number, over: Partial<C> = {}): C => ({
  id,
  venue_id: 2,
  name: `Court ${id}`,
  sort_order,
  is_active: true,
  ...over,
});
const page = (data: C[]) => ({ data, total: data.length, page: 1, limit: 100, has_more: false });

function setup(permissions = ['COURT:Manage']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 2, name: 'Riverside', is_master: true, groups: [] },
    { venue_id: 5, name: 'Lakeside', is_master: true, groups: [] },
  ]);
  renderWithAuth(<CourtAdmin />, { status: 'authenticated', user: owner });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('venue=2');
});

describe('CourtAdmin', () => {
  it('lists courts by sort_order, inactive ones marked, each linking to prices', async () => {
    api.courts.mockResolvedValue(
      page([court(1, 20), court(2, 10), court(3, 15, { is_active: false })]) as never,
    );
    setup();
    await screen.findByText('Court 2');
    const names = screen.getAllByTestId('court-name').map((n) => n.textContent);
    expect(names).toEqual(['Court 2', 'Court 3', 'Court 1']);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Prices for Court 2' })).toHaveAttribute(
      'href',
      '/staff/courts/2/pricing',
    );
    expect(api.courts).toHaveBeenCalledWith(2);
  });

  it('adds a court to the selected venue and the list refetches', async () => {
    const u = userEvent.setup();
    const list = [court(1, 1)];
    api.courts.mockImplementation(() => Promise.resolve(page([...list]) as never));
    api.createCourt.mockImplementation((_v, body) => {
      const created = court(9, body.sort_order ?? 0, { name: body.name });
      list.push(created);
      return Promise.resolve(created as never);
    });
    setup();
    await screen.findByText('Court 1');
    await u.type(screen.getByLabelText('Name'), 'Court 9');
    await u.clear(screen.getByLabelText('Sort order'));
    await u.type(screen.getByLabelText('Sort order'), '5');
    await u.click(screen.getByRole('button', { name: 'Add court' }));
    await waitFor(() =>
      expect(api.createCourt).toHaveBeenCalledWith(2, { name: 'Court 9', sort_order: 5 }),
    );
    expect(await screen.findByText('Court 9')).toBeInTheDocument();
  });

  it('deactivates with is_active false', async () => {
    const u = userEvent.setup();
    api.courts.mockResolvedValue(page([court(1, 1)]) as never);
    api.updateCourt.mockResolvedValue(court(1, 1, { is_active: false }) as never);
    setup();
    await u.click(await screen.findByRole('button', { name: 'Deactivate Court 1' }));
    await waitFor(() => expect(api.updateCourt).toHaveBeenCalledWith(1, { is_active: false }));
  });

  it('edits the name and sort order', async () => {
    const u = userEvent.setup();
    api.courts.mockResolvedValue(page([court(1, 1)]) as never);
    api.updateCourt.mockResolvedValue(court(1, 7, { name: 'Centre' }) as never);
    setup();
    await u.click(await screen.findByRole('button', { name: 'Edit Court 1' }));
    const name = screen.getByLabelText('Court 1 name');
    await u.clear(name);
    await u.type(name, 'Centre');
    const order = screen.getByLabelText('Court 1 sort order');
    await u.clear(order);
    await u.type(order, '7');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.updateCourt).toHaveBeenCalledWith(1, { name: 'Centre', sort_order: 7 }),
    );
  });

  it('a rename also refreshes the single court and the catalog courts', async () => {
    const u = userEvent.setup();
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    api.courts.mockResolvedValue(page([court(1, 1)]) as never);
    api.updateCourt.mockResolvedValue(court(1, 1, { name: 'Centre' }) as never);
    setup();
    await u.click(await screen.findByRole('button', { name: 'Edit Court 1' }));
    const name = screen.getByLabelText('Court 1 name');
    await u.clear(name);
    await u.type(name, 'Centre');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: setupKeys.court(1) }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.courts(2) });
    invalidate.mockRestore();
  });

  it('renders a 422 detail', async () => {
    const u = userEvent.setup();
    api.courts.mockResolvedValue(page([]) as never);
    api.createCourt.mockRejectedValue(
      new ApiError(422, { detail: 'sort_order must be at most 10000', code: 'V', request_id: 'r' }),
    );
    setup();
    await u.type(await screen.findByLabelText('Name'), 'X');
    await u.click(screen.getByRole('button', { name: 'Add court' }));
    expect(await screen.findByText('sort_order must be at most 10000')).toBeInTheDocument();
  });

  it('shows Not available without COURT:Manage', async () => {
    setup(['VENUE:Manage']);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(api.courts).not.toHaveBeenCalled();
  });
});
