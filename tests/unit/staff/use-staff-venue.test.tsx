import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '@/features/catalog/api';
import { useStaffVenue, VenuePicker } from '@/features/staff';
import { renderWithAuth, router, setSearch } from '../auth/render';

vi.mock('@/features/catalog/api', () => ({ catalogApi: { venues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/schedule',
}));

const venue = (id: number) => ({ id, name: `Venue ${id}`, address: null, is_active: true });
const user = (venue_id: number | null) => ({ id: 1, venue_id, role: 'VENUE_STAFF' }) as never;

function Probe() {
  const v = useStaffVenue();
  return (
    <>
      <p data-testid="id">{String(v.venueId)}</p>
      <p data-testid="pick">{String(v.canPick)}</p>
      <VenuePicker />
    </>
  );
}

function mockCatalog() {
  vi.mocked(catalogApi.venues).mockResolvedValue({
    data: [venue(2), venue(5)],
    total: 2,
    page: 1,
    limit: 100,
    has_more: false,
  } as never);
}

describe('useStaffVenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalog();
  });

  it('pins a venue-bound user to their venue, ignoring ?venue= and hiding the picker', async () => {
    setSearch('venue=5');
    renderWithAuth(<Probe />, { status: 'authenticated', user: user(3) });

    expect(screen.getByTestId('id')).toHaveTextContent('3');
    expect(screen.getByTestId('pick')).toHaveTextContent('false');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('uses ?venue= for the all-venues user when it is listed', async () => {
    setSearch('venue=5&date=2026-10-23');
    renderWithAuth(<Probe />, { status: 'authenticated', user: user(null) });

    expect(await screen.findByRole('combobox')).toHaveValue('5');
    expect(screen.getByTestId('id')).toHaveTextContent('5');
    expect(screen.getByTestId('pick')).toHaveTextContent('true');
  });

  it('falls back to the first venue when ?venue= is unlisted', async () => {
    setSearch('venue=99');
    renderWithAuth(<Probe />, { status: 'authenticated', user: user(null) });

    expect(await screen.findByRole('combobox')).toHaveValue('2');
    expect(screen.getByTestId('id')).toHaveTextContent('2');
  });

  it('setVenue replaces the URL and keeps the other params', async () => {
    setSearch('venue=5&date=2026-10-23');
    renderWithAuth(<Probe />, { status: 'authenticated', user: user(null) });
    const select = await screen.findByRole('combobox');
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.selectOptions(select, '2');

    expect(router.replace).toHaveBeenCalledWith('/staff/schedule?venue=2&date=2026-10-23');
  });
});
