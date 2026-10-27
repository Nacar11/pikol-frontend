import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { PricePreview, PriceRules } from '@/features/setup';
import { setupApi } from '@/features/setup/api';
import { ApiError } from '@/lib/api-client';
import { manilaToday } from '@/lib/manila';
import { renderWithAuth } from '../auth/render';
import { choose } from '../select';

vi.mock('@/features/setup/api', () => ({
  setupApi: {
    court: vi.fn(),
    priceRules: vi.fn(),
    createPriceRule: vi.fn(),
    updatePriceRule: vi.fn(),
    deletePriceRule: vi.fn(),
    dayPrices: vi.fn(),
  },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

const api = vi.mocked(setupApi);
const owner = { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never;

type R = {
  id: number;
  court_id: number;
  day_of_week: number | null;
  hour_of_day: number | null;
  price_centavos: number;
};
const rule = (id: number, over: Partial<R> = {}): R => ({
  id,
  court_id: 4,
  day_of_week: null,
  hour_of_day: null,
  price_centavos: 40000,
  ...over,
});

function setup(ui: React.ReactElement, permissions = ['PRICE:Manage']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  renderWithAuth(ui, { status: 'authenticated', user: owner });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.court.mockResolvedValue({
    id: 4,
    venue_id: 2,
    name: 'Court 4',
    sort_order: 1,
    is_active: true,
  } as never);
});

describe('PriceRules', () => {
  it('lists rules with day, hour and price labels', async () => {
    api.priceRules.mockResolvedValue([
      rule(1, { day_of_week: 0, hour_of_day: 18, price_centavos: 60000 }),
      rule(2),
    ] as never);
    setup(<PriceRules courtId={4} />);
    const rows = await screen.findAllByRole('listitem');
    expect(within(rows[0]!).getByText('Sunday')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('6 PM')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('₱600')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Any day')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Any hour')).toBeInTheDocument();
    expect(api.priceRules).toHaveBeenCalledWith(4);
  });

  it('adds Any day / 6 PM / 600 without a day_of_week key, and the list refetches', async () => {
    const u = userEvent.setup();
    const list: R[] = [rule(1)];
    api.priceRules.mockImplementation(() => Promise.resolve([...list] as never));
    api.createPriceRule.mockImplementation((_c, body) => {
      const created = rule(9, { hour_of_day: body.hour_of_day ?? null, ...body });
      list.push(created);
      return Promise.resolve(created as never);
    });
    setup(<PriceRules courtId={4} />);
    await screen.findByText('₱400');
    await choose(u, screen.getByLabelText('Hour'), '6 PM');
    await u.type(screen.getByLabelText('Price (pesos)'), '600');
    await u.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(api.createPriceRule).toHaveBeenCalledTimes(1));
    const body = api.createPriceRule.mock.calls[0]![1];
    expect(api.createPriceRule.mock.calls[0]![0]).toBe(4);
    expect(body).toEqual({ hour_of_day: 18, price_centavos: 60000 });
    expect('day_of_week' in body).toBe(false);
    expect(await screen.findByText('₱600')).toBeInTheDocument();
  });

  it('sends a chosen day', async () => {
    const u = userEvent.setup();
    api.priceRules.mockResolvedValue([] as never);
    api.createPriceRule.mockResolvedValue(rule(9) as never);
    setup(<PriceRules courtId={4} />);
    await choose(u, await screen.findByLabelText('Day'), 'Saturday');
    await u.type(screen.getByLabelText('Price (pesos)'), '500');
    await u.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() =>
      expect(api.createPriceRule).toHaveBeenCalledWith(4, {
        day_of_week: 6,
        price_centavos: 50000,
      }),
    );
  });

  it('edits a price to 750.50 and patches centavos', async () => {
    const u = userEvent.setup();
    api.priceRules.mockResolvedValue([rule(1)] as never);
    api.updatePriceRule.mockResolvedValue(rule(1, { price_centavos: 75050 }) as never);
    setup(<PriceRules courtId={4} />);
    await u.click(await screen.findByRole('button', { name: 'Edit price' }));
    const input = screen.getByLabelText('New price (pesos)');
    await u.clear(input);
    await u.type(input, '750.50');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.updatePriceRule).toHaveBeenCalledWith(1, { price_centavos: 75050 }),
    );
  });

  it('refuses 12.345 client-side with no request', async () => {
    const u = userEvent.setup();
    api.priceRules.mockResolvedValue([rule(1)] as never);
    setup(<PriceRules courtId={4} />);
    await u.click(await screen.findByRole('button', { name: 'Edit price' }));
    const input = screen.getByLabelText('New price (pesos)');
    await u.clear(input);
    await u.type(input, '12.345');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter an amount like 600 or 600.50.')).toBeInTheDocument();
    expect(api.updatePriceRule).not.toHaveBeenCalled();
  });

  it('refuses an invalid price on the add form with no request', async () => {
    const u = userEvent.setup();
    api.priceRules.mockResolvedValue([] as never);
    setup(<PriceRules courtId={4} />);
    await u.type(await screen.findByLabelText('Price (pesos)'), 'abc');
    await u.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(screen.getByText('Enter an amount like 600 or 600.50.')).toBeInTheDocument();
    expect(api.createPriceRule).not.toHaveBeenCalled();
  });

  it("renders a duplicate rule's 409 detail", async () => {
    const u = userEvent.setup();
    api.priceRules.mockResolvedValue([] as never);
    api.createPriceRule.mockRejectedValue(
      new ApiError(409, {
        detail: 'A rule for that day and hour already exists',
        code: 'C',
        request_id: 'r',
      }),
    );
    setup(<PriceRules courtId={4} />);
    await u.type(await screen.findByLabelText('Price (pesos)'), '600');
    await u.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(
      await screen.findByText('A rule for that day and hour already exists'),
    ).toBeInTheDocument();
  });

  it('requires a second click to delete', async () => {
    const u = userEvent.setup();
    const list: R[] = [rule(1), rule(2, { hour_of_day: 0 })];
    api.priceRules.mockImplementation(() => Promise.resolve([...list] as never));
    api.deletePriceRule.mockImplementation((id) => {
      list.splice(
        list.findIndex((r) => r.id === id),
        1,
      );
      return Promise.resolve();
    });
    setup(<PriceRules courtId={4} />);
    const rows = await screen.findAllByRole('listitem');
    await u.click(within(rows[0]!).getByRole('button', { name: 'Delete' }));
    expect(api.deletePriceRule).not.toHaveBeenCalled();
    await u.click(within(rows[0]!).getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(api.deletePriceRule).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
  });

  it('shows Not available without PRICE:Manage', async () => {
    setup(<PriceRules courtId={4} />, ['COURT:Manage']);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(api.priceRules).not.toHaveBeenCalled();
  });
});

describe('PricePreview', () => {
  it('renders 24 rows starting at 12 AM for today, and reloads on another day', async () => {
    const u = userEvent.setup();
    api.dayPrices.mockImplementation((_c, date) =>
      Promise.resolve(
        Array.from({ length: 24 }, (_, hour) => ({
          starts_at: `${date}T00:00:00Z`,
          hour,
          price_centavos: date === manilaToday() ? 40000 : 50000,
        })) as never,
      ),
    );
    setup(<PricePreview courtId={4} />);
    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(24);
    expect(within(rows[0]!).getByText('12 AM')).toBeInTheDocument();
    expect(within(rows[23]!).getByText('11 PM')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('₱400')).toBeInTheDocument();
    expect(api.dayPrices).toHaveBeenCalledWith(4, manilaToday());
    const strip = screen.getByRole('group', { name: 'Choose a day' });
    await u.click(within(strip).getAllByRole('button')[1]!);
    expect(await screen.findAllByText('₱500')).toHaveLength(24);
  });
});
