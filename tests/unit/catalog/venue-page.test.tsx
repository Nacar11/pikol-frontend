import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VenuePage from '@/app/(app)/venues/[venueId]/page';
import { catalogApi } from '@/features/catalog/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth, setSearch } from '../auth/render';

vi.mock('@/features/catalog/api', () => ({ catalogApi: { venues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  useParams: () => ({ venueId: '3' }),
}));

const api = vi.mocked(catalogApi);

describe('venue page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSearch('date=2026-10-23');
  });

  it('shows the error when the venue list cannot load, instead of spinning', async () => {
    api.venues.mockRejectedValue(
      new ApiError(403, { detail: 'You cannot see venues.', code: 'FORBIDDEN', request_id: 'r' }),
    );
    renderWithAuth(<VenuePage />, { status: 'authenticated' });
    expect(await screen.findByText('You cannot see venues.')).toBeInTheDocument();
  });
});
