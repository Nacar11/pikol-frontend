import { useQuery } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffVenueSync, useStaffVenue, VenueSwitcher } from '@/features/staff';
import { staffApi } from '@/features/staff/api';
import { VENUE_STORAGE_KEY } from '@/features/staff/use-staff-venue';
import { apiClient } from '@/lib/api-client';
import { renderWithAuth, router, setSearch } from '../auth/render';

vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/schedule',
}));

const mine = (venue_id: number) => ({
  venue_id,
  name: `Venue ${venue_id}`,
  is_master: false,
  groups: ['Front desk'],
});
const user = { id: 1 } as never;

function Probe() {
  const v = useStaffVenue();
  return (
    <>
      <p data-testid="id">{String(v.venueId)}</p>
      <p data-testid="pick">{String(v.canPick)}</p>
      <VenueSwitcher />
    </>
  );
}

describe('useStaffVenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    setSearch('');
    vi.mocked(staffApi.myVenues).mockResolvedValue([mine(2), mine(5)]);
  });

  it('uses ?venue= when it is one of the caller’s venues', async () => {
    setSearch('venue=5&date=2026-10-23');
    renderWithAuth(<Probe />, { status: 'authenticated', user });

    expect(await screen.findByRole('combobox')).toHaveAttribute('data-value', '5');
    expect(screen.getByTestId('id')).toHaveTextContent('5');
    expect(screen.getByTestId('pick')).toHaveTextContent('true');
  });

  it('never acts at a venue the caller does not hold, whatever the URL says', async () => {
    setSearch('venue=99');
    renderWithAuth(<Probe />, { status: 'authenticated', user });

    expect(await screen.findByRole('combobox')).toHaveAttribute('data-value', '2');
  });

  it('falls back to the venue remembered on this browser, then the first', async () => {
    window.localStorage.setItem(VENUE_STORAGE_KEY, '5');
    renderWithAuth(<Probe />, { status: 'authenticated', user });

    expect(await screen.findByRole('combobox')).toHaveAttribute('data-value', '5');
  });

  it('hides the picker when the caller works at one venue', async () => {
    vi.mocked(staffApi.myVenues).mockResolvedValue([mine(3)]);
    renderWithAuth(<Probe />, { status: 'authenticated', user });

    await waitFor(() => expect(screen.getByTestId('id')).toHaveTextContent('3'));
    expect(screen.getByTestId('pick')).toHaveTextContent('false');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('setVenue remembers the choice and replaces the URL, keeping other params', async () => {
    setSearch('venue=5&date=2026-10-23');
    renderWithAuth(<Probe />, { status: 'authenticated', user });
    const select = await screen.findByRole('combobox');
    const { default: userEvent } = await import('@testing-library/user-event');
    const u = userEvent.setup();
    await u.click(select);
    await u.click(await screen.findByRole('option', { name: 'Venue 2' }));

    expect(router.replace).toHaveBeenCalledWith('/staff/schedule?venue=2&date=2026-10-23');
    expect(window.localStorage.getItem(VENUE_STORAGE_KEY)).toBe('2');
  });
});

describe('StaffVenueSync', () => {
  const fetches: (string | null)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    fetches.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        fetches.push(new Headers(init.headers).get('X-Venue-ID'));
        return new Response('[]', { status: 200 });
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  function Child() {
    useQuery({ queryKey: ['probe'], queryFn: () => apiClient().get('/admin/bookings') });
    return null;
  }

  /** Re-renders on click, so a changed ?venue= is read again. */
  function Harness() {
    const [, bump] = useState(0);
    return (
      <>
        <button onClick={() => bump((n) => n + 1)}>rerender</button>
        <StaffVenueSync>
          <Child />
        </StaffVenueSync>
      </>
    );
  }

  it('sends the active venue on staff requests and refetches when it changes', async () => {
    vi.mocked(staffApi.myVenues).mockResolvedValue([mine(2), mine(5)]);
    setSearch('venue=5');
    renderWithAuth(<Harness />, { status: 'authenticated', user });
    await waitFor(() => expect(fetches).toContain('5'));

    setSearch('venue=2');
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }));

    await waitFor(() => expect(fetches.at(-1)).toBe('2'));
  });

  it('settles after choosing a venue instead of resetting forever', async () => {
    // Regression: resetting the venue list itself emptied the active venue,
    // which counted as another change — an endless reset loop that left
    // every page on its spinner.
    vi.mocked(staffApi.myVenues).mockResolvedValue([mine(2), mine(5)]);
    renderWithAuth(
      <StaffVenueSync>
        <Child />
      </StaffVenueSync>,
      { status: 'authenticated', user },
    );
    await waitFor(() => expect(fetches).toContain('2'));
    await new Promise((r) => setTimeout(r, 300));

    expect(staffApi.myVenues).toHaveBeenCalledTimes(1);
    expect(fetches.filter((v) => v === null).length).toBeLessThanOrEqual(1);
  });

  it('stops sending the header once the console unmounts', async () => {
    vi.mocked(staffApi.myVenues).mockResolvedValue([mine(2)]);
    const view = renderWithAuth(<StaffVenueSync>{null}</StaffVenueSync>, {
      status: 'authenticated',
      user,
    });
    await waitFor(() => expect(staffApi.myVenues).toHaveBeenCalled());
    view.unmount();

    await apiClient().get('/users/me');

    expect(fetches.at(-1)).toBeNull();
  });
});
