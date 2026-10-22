import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminBookingsApi } from '@/features/admin-bookings';
import { authApi } from '@/features/auth/api';
import { catalogApi } from '@/features/catalog/api';
import { ClosureAdmin } from '@/features/setup';
import { setupApi } from '@/features/setup/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth, setSearch } from '../auth/render';

vi.mock('@/features/setup/api', () => ({
  setupApi: { courts: vi.fn(), closeCourts: vi.fn() },
}));
vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: { list: vi.fn(), reopenClosure: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/catalog/api', () => ({ catalogApi: { venues: vi.fn(), courts: vi.fn() } }));
vi.mock('next/navigation', async () => ({
  ...(await import('../auth/render')).navigationMock,
  usePathname: () => '/staff/closures',
}));

const api = vi.mocked(setupApi);
const bookings = vi.mocked(adminBookingsApi);
const owner = { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never;
// 23 Oct 2026, 12:00 Manila.
const NOW = new Date('2026-10-23T04:00:00Z');

const court = (id: number, sort_order: number, is_active = true) => ({
  id,
  venue_id: 2,
  name: `Court ${id}`,
  sort_order,
  is_active,
});
const courtPage = {
  data: [court(2, 2), court(1, 1), court(3, 3, false)],
  total: 3,
  page: 1,
  limit: 100,
  has_more: false,
};

const closure = (id: number, starts: string, ends: string, notes: string) => ({
  id,
  court_id: 1,
  court_name: 'Court 1',
  venue_id: 2,
  type: 'MAINTENANCE',
  booking_status: 'CONFIRMED',
  starts_at: starts,
  ends_at: ends,
  notes,
});
const bookingPage = (data: unknown[]) => ({
  data,
  total: data.length,
  page: 1,
  limit: 200,
  has_more: false,
});

function renderPage(permissions = ['CLOSURE:Manage']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  vi.mocked(catalogApi.venues).mockResolvedValue({
    data: [{ id: 2, name: 'Riverside', address: null, is_active: true }],
    total: 1,
    page: 1,
    limit: 100,
    has_more: false,
  } as never);
  renderWithAuth(<ClosureAdmin />, { status: 'authenticated', user: owner });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('venue=2');
  // The admin courts route needs COURT:Manage; the closure form must not use it.
  api.courts.mockRejectedValue(
    new ApiError(403, { detail: 'Forbidden', code: 'FORBIDDEN', request_id: 'r' }),
  );
  vi.mocked(catalogApi.courts).mockResolvedValue(courtPage as never);
  bookings.list.mockResolvedValue(bookingPage([]) as never);
});
afterEach(() => vi.useRealTimers());

async function fill(day: string, startHour: string, endDay: string, endHour: string) {
  fireEvent.change(await screen.findByLabelText('Start day'), { target: { value: day } });
  await userEvent.selectOptions(screen.getByLabelText('Start hour'), startHour);
  fireEvent.change(screen.getByLabelText('End day'), { target: { value: endDay } });
  await userEvent.selectOptions(screen.getByLabelText('End hour'), endHour);
}

describe('ClosureForm', () => {
  it('posts Manila instants for the checked courts (23 Oct 10 PM to 24 Oct 2 AM)', async () => {
    const u = userEvent.setup();
    api.closeCourts.mockResolvedValue([] as never);
    renderPage();
    await u.click(await screen.findByLabelText('Court 1'));
    await u.click(screen.getByLabelText('Court 2'));
    expect(screen.queryByLabelText('Court 3')).not.toBeInTheDocument();
    await fill('2026-10-23', '22', '2026-10-24', '2');
    await u.type(screen.getByLabelText('Reason'), 'Resurfacing');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    await waitFor(() =>
      expect(api.closeCourts).toHaveBeenCalledWith({
        court_ids: [1, 2],
        starts_at: '2026-10-23T22:00:00+08:00',
        ends_at: '2026-10-24T02:00:00+08:00',
        reason: 'Resurfacing',
      }),
    );
  });

  it('lets venue staff (CLOSURE:Manage, no COURT:Manage) pick courts and close them', async () => {
    const u = userEvent.setup();
    api.closeCourts.mockResolvedValue([] as never);
    renderPage(['CLOSURE:Manage', 'BOOKING:ReadAny']);
    await u.click(await screen.findByLabelText('Court 1'));
    expect(screen.getByLabelText('Court 2')).toBeInTheDocument();
    await fill('2026-10-23', '22', '2026-10-24', '2');
    await u.type(screen.getByLabelText('Reason'), 'Nets');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    await waitFor(() =>
      expect(api.closeCourts).toHaveBeenCalledWith(expect.objectContaining({ court_ids: [1] })),
    );
    expect(catalogApi.courts).toHaveBeenCalledWith(2);
    expect(api.courts).not.toHaveBeenCalled();
  });

  it('renders the courts query error', async () => {
    vi.mocked(catalogApi.courts).mockRejectedValue(
      new ApiError(404, { detail: 'Venue not found.', code: 'NOT_FOUND', request_id: 'r' }),
    );
    renderPage();
    expect(await screen.findByText('Venue not found.')).toBeInTheDocument();
  });

  it('Select all checks every active court', async () => {
    const u = userEvent.setup();
    api.closeCourts.mockResolvedValue([] as never);
    renderPage();
    await u.click(await screen.findByLabelText('Select all'));
    expect(screen.getByLabelText('Court 1')).toBeChecked();
    expect(screen.getByLabelText('Court 2')).toBeChecked();
    await fill('2026-10-23', '8', '2026-10-23', '10');
    await u.type(screen.getByLabelText('Reason'), 'Nets');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    await waitFor(() =>
      expect(api.closeCourts).toHaveBeenCalledWith(expect.objectContaining({ court_ids: [1, 2] })),
    );
  });

  it('blocks end-before-start, no courts and a blank reason without a request', async () => {
    const u = userEvent.setup();
    renderPage();
    await fill('2026-10-23', '10', '2026-10-23', '8');
    await u.type(screen.getByLabelText('Reason'), 'x');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    expect(await screen.findByText('Choose at least one court.')).toBeInTheDocument();
    await u.click(screen.getByLabelText('Court 1'));
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    expect(await screen.findByText('The end must be after the start.')).toBeInTheDocument();
    await fill('2026-10-23', '8', '2026-10-23', '10');
    await u.clear(screen.getByLabelText('Reason'));
    await u.type(screen.getByLabelText('Reason'), '   ');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    expect(await screen.findByText('Give a reason.')).toBeInTheDocument();
    expect(api.closeCourts).not.toHaveBeenCalled();
  });

  it('a 409 says nothing was closed and shows the server detail', async () => {
    const u = userEvent.setup();
    api.closeCourts.mockRejectedValue(
      new ApiError(409, {
        detail: 'Court 1 is booked at 9 PM.',
        code: 'SLOT_UNAVAILABLE',
        request_id: 'r',
      }),
    );
    renderPage();
    await u.click(await screen.findByLabelText('Court 1'));
    await fill('2026-10-23', '8', '2026-10-23', '10');
    await u.type(screen.getByLabelText('Reason'), 'Nets');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    expect(
      await screen.findByText(
        /Some of those hours are already booked\. Nothing was closed\. Court 1 is booked at 9 PM\./,
      ),
    ).toBeInTheDocument();
  });

  it.each(['RANGE_TOO_LONG', 'IN_THE_PAST'])('renders the %s detail', async (code) => {
    const u = userEvent.setup();
    api.closeCourts.mockRejectedValue(
      new ApiError(422, { detail: `detail for ${code}`, code, request_id: 'r' }),
    );
    renderPage();
    await u.click(await screen.findByLabelText('Court 1'));
    await fill('2026-10-23', '8', '2026-10-23', '10');
    await u.type(screen.getByLabelText('Reason'), 'Nets');
    await u.click(screen.getByRole('button', { name: 'Close courts' }));
    expect(await screen.findByText(`detail for ${code}`)).toBeInTheDocument();
  });

  it('is gated on CLOSURE:Manage', async () => {
    renderPage(['BOOKING:ReadAny']);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(screen.queryByLabelText('Select all')).not.toBeInTheDocument();
  });
});

describe('ClosureList', () => {
  it('hides ended closures and sorts the rest by start', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    bookings.list.mockResolvedValue(
      bookingPage([
        closure(3, '2026-10-25T08:00:00+08:00', '2026-10-25T10:00:00+08:00', 'Later'),
        closure(1, '2026-10-23T08:00:00+08:00', '2026-10-23T10:00:00+08:00', 'Already over'),
        closure(2, '2026-10-24T08:00:00+08:00', '2026-10-24T10:00:00+08:00', 'Soon'),
      ]) as never,
    );
    renderPage();
    await screen.findByText('Soon');
    expect(screen.queryByText('Already over')).not.toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Soon');
    expect(items[1]).toContain('Later');
    expect(bookings.list).toHaveBeenCalledWith({
      venue_id: 2,
      type: 'MAINTENANCE',
      booking_status: 'CONFIRMED',
      ends_after: NOW.toISOString(),
      limit: 200,
    });
  });

  it('requires a reason to reopen, then refetches the list', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const u = userEvent.setup();
    let rows = [closure(2, '2026-10-24T08:00:00+08:00', '2026-10-24T10:00:00+08:00', 'Soon')];
    bookings.list.mockImplementation(() => Promise.resolve(bookingPage([...rows]) as never));
    bookings.reopenClosure.mockImplementation(() => {
      rows = [];
      return Promise.resolve({} as never);
    });
    renderPage();
    const item = (await screen.findByText('Soon')).closest('li')!;
    const submit = within(item).getByRole('button', { name: 'Reopen' });
    expect(submit).toBeDisabled();
    await u.type(within(item).getByLabelText('Why is the court reopening?'), 'Fixed early');
    await u.click(submit);
    await waitFor(() => expect(bookings.reopenClosure).toHaveBeenCalledWith(2, 'Fixed early'));
    await waitFor(() => expect(screen.queryByText('Soon')).not.toBeInTheDocument());
  });

  it('renders a reopen error', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const u = userEvent.setup();
    bookings.list.mockResolvedValue(
      bookingPage([
        closure(2, '2026-10-24T08:00:00+08:00', '2026-10-24T10:00:00+08:00', 'Soon'),
      ]) as never,
    );
    bookings.reopenClosure.mockRejectedValue(
      new ApiError(409, { detail: 'Already reopened.', code: 'NOT_CANCELLABLE', request_id: 'r' }),
    );
    renderPage();
    const item = (await screen.findByText('Soon')).closest('li')!;
    await u.type(within(item).getByLabelText('Why is the court reopening?'), 'x');
    await u.click(within(item).getByRole('button', { name: 'Reopen' }));
    expect(await screen.findByText('Already reopened.')).toBeInTheDocument();
  });
});
