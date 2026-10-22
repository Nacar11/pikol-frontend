import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { VenueAdmin } from '@/features/setup';
import { setupApi } from '@/features/setup/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/setup/api', () => ({
  setupApi: { venues: vi.fn(), createVenue: vi.fn(), updateVenue: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

const api = vi.mocked(setupApi);
const user = { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never;

type V = { id: number; name: string; address: string | null; is_active: boolean };
const venue = (id: number, over: Partial<V> = {}): V => ({
  id,
  name: `Venue ${id}`,
  address: null,
  is_active: true,
  ...over,
});
const page = (data: V[]) => ({ data, total: data.length, page: 1, limit: 100, has_more: false });

function setup(permissions = ['VENUE:Manage']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  renderWithAuth(<VenueAdmin />, { status: 'authenticated', user });
}

beforeEach(() => vi.clearAllMocks());

describe('VenueAdmin', () => {
  it('lists venues and marks inactive ones', async () => {
    api.venues.mockResolvedValue(page([venue(1), venue(2, { is_active: false })]) as never);
    setup();
    expect(await screen.findByText('Venue 1')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate Venue 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate Venue 1' })).toBeInTheDocument();
  });

  it('posts a new venue and the list refetches', async () => {
    const u = userEvent.setup();
    const list = [venue(1)];
    api.venues.mockImplementation(() => Promise.resolve(page([...list]) as never));
    api.createVenue.mockImplementation((body) => {
      const created = venue(2, { name: body.name, address: body.address ?? null });
      list.push(created);
      return Promise.resolve(created as never);
    });
    setup();
    await screen.findByText('Venue 1');
    await u.type(screen.getByLabelText('Name'), 'Lakeside');
    await u.type(screen.getByLabelText('Address'), '12 Shore Rd');
    await u.click(screen.getByRole('button', { name: 'Add venue' }));
    await waitFor(() =>
      expect(api.createVenue).toHaveBeenCalledWith({ name: 'Lakeside', address: '12 Shore Rd' }),
    );
    expect(await screen.findByText('Lakeside')).toBeInTheDocument();
  });

  it('deactivates with is_active false', async () => {
    const u = userEvent.setup();
    let active = true;
    api.venues.mockImplementation(() =>
      Promise.resolve(page([venue(1, { is_active: active })]) as never),
    );
    api.updateVenue.mockImplementation(() => {
      active = false;
      return Promise.resolve(venue(1, { is_active: false }) as never);
    });
    setup();
    await u.click(await screen.findByRole('button', { name: 'Deactivate Venue 1' }));
    await waitFor(() => expect(api.updateVenue).toHaveBeenCalledWith(1, { is_active: false }));
    expect(await screen.findByRole('button', { name: 'Activate Venue 1' })).toBeInTheDocument();
  });

  it('renames a venue', async () => {
    const u = userEvent.setup();
    api.venues.mockResolvedValue(page([venue(1)]) as never);
    api.updateVenue.mockResolvedValue(venue(1, { name: 'Riverside' }) as never);
    setup();
    await u.click(await screen.findByRole('button', { name: 'Edit Venue 1' }));
    const name = screen.getByLabelText('Venue 1 name');
    await u.clear(name);
    await u.type(name, 'Riverside');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.updateVenue).toHaveBeenCalledWith(1, { name: 'Riverside', address: null }),
    );
  });

  it('renders the server detail on a rejected add', async () => {
    const u = userEvent.setup();
    api.venues.mockResolvedValue(page([venue(1)]) as never);
    api.createVenue.mockRejectedValue(
      new ApiError(409, { detail: 'Venue name already exists', code: 'CONFLICT', request_id: 'r' }),
    );
    setup();
    await screen.findByText('Venue 1');
    await u.type(screen.getByLabelText('Name'), 'Venue 1');
    await u.click(screen.getByRole('button', { name: 'Add venue' }));
    expect(await screen.findByText('Venue name already exists')).toBeInTheDocument();
  });

  it('shows Not available without VENUE:Manage', async () => {
    setup(['COURT:Manage']);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(api.venues).not.toHaveBeenCalled();
    expect(within(document.body).queryByText('Add venue')).not.toBeInTheDocument();
  });
});
