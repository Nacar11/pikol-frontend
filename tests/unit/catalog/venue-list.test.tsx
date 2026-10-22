import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '@/features/catalog/api';
import { VenueList } from '@/features/catalog';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/catalog/api', () => ({ catalogApi: { venues: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

const api = vi.mocked(catalogApi);
const page = (data: unknown[]) => ({
  data,
  total: data.length,
  page: 1,
  limit: 100,
  has_more: false,
});

describe('VenueList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders venue names linking to /venues/{id}', async () => {
    api.venues.mockResolvedValue(
      page([
        { id: 3, name: 'Alpha Courts', address: 'Makati', is_active: true },
        { id: 4, name: 'Beta Courts', address: null, is_active: true },
      ]) as never,
    );
    renderWithAuth(<VenueList />, { status: 'authenticated' });
    const link = await screen.findByRole('link', { name: /Alpha Courts/ });
    expect(link).toHaveAttribute('href', '/venues/3');
    expect(screen.getByRole('link', { name: /Beta Courts/ })).toHaveAttribute('href', '/venues/4');
  });

  it('shows the empty state', async () => {
    api.venues.mockResolvedValue(page([]) as never);
    renderWithAuth(<VenueList />, { status: 'authenticated' });
    expect(await screen.findByText('No venues are open for booking yet.')).toBeInTheDocument();
  });
});
