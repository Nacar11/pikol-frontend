import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminBookingsApi } from '@/features/admin-bookings';
import { authApi } from '@/features/auth/api';
import { catalogApi } from '@/features/catalog/api';
import { staffApi } from '@/features/staff/api';
import { ClosureAdmin } from '@/features/setup';
import { setupApi } from '@/features/setup/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth, setSearch } from '../auth/render';
import { choose } from '../select';

vi.mock('@/features/setup/api', () => ({
  setupApi: { courts: vi.fn(), closeCourts: vi.fn() },
}));
vi.mock('@/features/admin-bookings/api', () => ({
  adminBookingsApi: { list: vi.fn(), reopenClosure: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('@/features/catalog/api', () => ({ catalogApi: { courts: vi.fn() } }));
vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
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
  vi.mocked(staffApi.myVenues).mockResolvedValue([
    { venue_id: 2, name: 'Riverside', is_master: true, groups: [] },
  ]);
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

const hourLabel = (h: string) => {
  const n = Number(h);
  return `${n % 12 === 0 ? 12 : n % 12} ${n < 12 ? 'AM' : 'PM'}`;
};

async function fill(day: string, startHour: string, endDay: string, endHour: string) {
  const u = userEvent.setup();
  fireEvent.change(await screen.findByLabelText('Start day'), { target: { value: day } });
  await choose(u, screen.getByLabelText('Start hour'), hourLabel(startHour));
  fireEvent.change(screen.getByLabelText('End day'), { target: { value: endDay } });
  await choose(u, screen.getByLabelText('End hour'), hourLabel(endHour));
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

  it('defaults to the next Manila hour, for one hour', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    renderPage();
    expect(await screen.findByLabelText('Start day')).toHaveValue('2026-10-23');
    expect(screen.getByLabelText('Start hour')).toHaveAttribute('data-value', '13');
    expect(screen.getByLabelText('End day')).toHaveValue('2026-10-23');
    expect(screen.getByLabelText('End hour')).toHaveAttribute('data-value', '14');
  });

  it('rolls the default over midnight (23:30 Manila starts at 12 AM tomorrow)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-23T15:30:00Z') });
    renderPage();
    expect(await screen.findByLabelText('Start day')).toHaveValue('2026-10-24');
    expect(screen.getByLabelText('Start hour')).toHaveAttribute('data-value', '0');
    expect(screen.getByLabelText('End day')).toHaveValue('2026-10-24');
    expect(screen.getByLabelText('End hour')).toHaveAttribute('data-value', '1');
  });

  it('rolls the end over midnight (10:30 PM starts at 11 PM, ends 12 AM tomorrow)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-23T14:30:00Z') });
    renderPage();
    expect(await screen.findByLabelText('Start day')).toHaveValue('2026-10-23');
    expect(screen.getByLabelText('Start hour')).toHaveAttribute('data-value', '23');
    expect(screen.getByLabelText('End day')).toHaveValue('2026-10-24');
    expect(screen.getByLabelText('End hour')).toHaveAttribute('data-value', '0');
  });

  it('a preset fills the range and the summary counts its hours', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: 'All day tomorrow' }));
    expect(screen.getByLabelText('Start day')).toHaveValue('2026-10-24');
    expect(screen.getByLabelText('Start hour')).toHaveAttribute('data-value', '0');
    expect(screen.getByLabelText('End day')).toHaveValue('2026-10-25');
    expect(screen.getByLabelText('End hour')).toHaveAttribute('data-value', '0');
    expect(screen.getByText('24 h')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All day tomorrow' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await u.click(screen.getByRole('button', { name: 'Next 2 hours' }));
    expect(screen.getByText('Fri 23 Oct · 1 PM – 3 PM')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Maintenance' }));
    expect(screen.getByLabelText('Reason')).toHaveValue('Maintenance');
  });

  it('Select all checks every active court', async () => {
    const u = userEvent.setup();
    api.closeCourts.mockResolvedValue([] as never);
    renderPage();
    await u.click(await screen.findByRole('button', { name: 'Select all' }));
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
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
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
    const soon = await screen.findByText('Soon');
    expect(screen.queryByText('Already over')).not.toBeInTheDocument();
    expect(
      soon.compareDocumentPosition(screen.getByText('Later')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('2 closures')).toBeInTheDocument();
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
    await u.click(within(item).getByRole('button', { name: 'Reopen Soon' }));
    const submit = within(item).getByRole('button', { name: 'Reopen court' });
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
    await u.click(within(item).getByRole('button', { name: 'Reopen Soon' }));
    await u.type(within(item).getByLabelText('Why is the court reopening?'), 'x');
    await u.click(within(item).getByRole('button', { name: 'Reopen court' }));
    expect(await screen.findByText('Already reopened.')).toBeInTheDocument();
  });

  it('shows rows closed together as one closure and reopens every court in it', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    const u = userEvent.setup();
    const range = ['2026-10-24T08:00:00+08:00', '2026-10-24T14:00:00+08:00'] as const;
    bookings.list.mockResolvedValue(
      bookingPage([
        closure(4, ...range, 'Inter-club'),
        { ...closure(5, ...range, 'Inter-club'), court_id: 2, court_name: 'Court 2' },
      ]) as never,
    );
    bookings.reopenClosure.mockResolvedValue({} as never);
    renderPage();
    const item = (await screen.findByText('Inter-club')).closest('li')!;
    expect(screen.getByText('1 closure')).toBeInTheDocument();
    expect(within(item).getByText('8 AM – 2 PM · 6 h')).toBeInTheDocument();
    expect(within(item).getByText('Court 1')).toBeInTheDocument();
    expect(within(item).getByText('Court 2')).toBeInTheDocument();
    expect(
      within(item).getByRole('link', { name: 'View Inter-club on the schedule' }),
    ).toHaveAttribute('href', '/staff/schedule?venue=2&date=2026-10-24');
    await u.click(within(item).getByRole('button', { name: 'Reopen Inter-club' }));
    await u.type(within(item).getByLabelText('Why are the courts reopening?'), 'Cancelled');
    await u.click(within(item).getByRole('button', { name: 'Reopen courts' }));
    await waitFor(() => expect(bookings.reopenClosure).toHaveBeenCalledTimes(2));
    expect(bookings.reopenClosure).toHaveBeenCalledWith(4, 'Cancelled');
    expect(bookings.reopenClosure).toHaveBeenCalledWith(5, 'Cancelled');
  });
});
