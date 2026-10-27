import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { ParameterTable } from '@/features/parameters';
import { parametersApi } from '@/features/parameters/api';
import { ApiError } from '@/lib/api-client';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/parameters/api', () => ({
  parametersApi: { list: vi.fn(), update: vi.fn() },
}));
vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

const api = vi.mocked(parametersApi);
const user = { id: 1, venue_id: null, role: 'SUPER_ADMIN' } as never;

type P = {
  key: string;
  value: string;
  value_type: 'int' | 'decimal' | 'bool' | 'string';
  description: string;
  updated_at: string;
  updated_by_user_id: number | null;
};
const param = (
  key: string,
  value: string,
  value_type: P['value_type'],
  description: string,
): P => ({
  key,
  value,
  value_type,
  description,
  updated_at: '2026-10-01T02:00:00Z',
  updated_by_user_id: null,
});
const rows = () => [
  param('hold_duration_minutes', '15', 'int', 'How long a hold lasts'),
  param('fee_percentage', '2.5', 'decimal', 'Service fee percentage'),
  param('maintenance_mode', 'false', 'bool', 'Block new bookings'),
  param('brand_name', 'Pikol', 'string', 'Shown on receipts'),
];

function setup(permissions = ['PARAMETER:Manage']) {
  vi.mocked(authApi.permissions).mockResolvedValue(permissions as never);
  renderWithAuth(<ParameterTable />, { status: 'authenticated', user });
}

beforeEach(() => vi.clearAllMocks());

describe('ParameterTable', () => {
  it('renders rows with keys, descriptions and typed editors', async () => {
    api.list.mockResolvedValue(rows() as never);
    setup();
    expect(await screen.findByText('hold_duration_minutes')).toBeInTheDocument();
    expect(screen.getByText('How long a hold lasts')).toBeInTheDocument();
    expect(screen.getByLabelText('hold_duration_minutes')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('maintenance_mode')).toHaveAttribute('type', 'checkbox');
    expect(screen.getByLabelText('brand_name')).toHaveAttribute('type', 'text');
    expect(
      screen.getByText(/Changes apply within a minute and affect new bookings only/),
    ).toBeInTheDocument();
  });

  it('patches the value as a string and shows the response', async () => {
    const u = userEvent.setup();
    api.list.mockResolvedValue(rows() as never);
    api.update.mockResolvedValue({
      ...param('hold_duration_minutes', '20', 'int', 'How long a hold lasts'),
      updated_by_user_id: 1,
    } as never);
    setup();
    const input = await screen.findByLabelText('hold_duration_minutes');
    await u.clear(input);
    await u.type(input, '20');
    await u.click(screen.getByRole('button', { name: 'Save hold_duration_minutes' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('hold_duration_minutes', '20'));
    await waitFor(() => expect(screen.getByLabelText('hold_duration_minutes')).toHaveValue(20));
  });

  it('sends a checkbox as "true"/"false"', async () => {
    const u = userEvent.setup();
    api.list.mockResolvedValue(rows() as never);
    api.update.mockResolvedValue(param('maintenance_mode', 'true', 'bool', 'x') as never);
    setup();
    await u.click(await screen.findByLabelText('maintenance_mode'));
    await u.click(screen.getByRole('button', { name: 'Save maintenance_mode' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('maintenance_mode', 'true'));
  });

  it('renders a 422 detail under that row and keeps the old value', async () => {
    const u = userEvent.setup();
    api.list.mockResolvedValue(rows() as never);
    api.update.mockRejectedValue(
      new ApiError(422, {
        detail: 'min_lead_minutes: must be less than hold_duration_minutes',
        code: 'INVALID_PARAMETER',
        request_id: 'r',
      }),
    );
    setup();
    const input = await screen.findByLabelText('hold_duration_minutes');
    await u.clear(input);
    await u.type(input, '1');
    await u.click(screen.getByRole('button', { name: 'Save hold_duration_minutes' }));
    const row = screen.getByText('hold_duration_minutes').closest('li') as HTMLElement;
    expect(
      await within(row).findByText('min_lead_minutes: must be less than hold_duration_minutes'),
    ).toBeInTheDocument();
    expect(within(row).getByText('15')).toBeInTheDocument();
    const other = screen.getByText('brand_name').closest('li') as HTMLElement;
    expect(within(other).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('names known keys in plain words, with units, grouped into sections', async () => {
    api.list.mockResolvedValue([
      param('default_slot_price_centavos', '50000', 'int', 'Price when no rule matches'),
      param('hold_duration_minutes', '15', 'int', 'How long a hold lasts'),
      param('brand_name', 'Pikol', 'string', 'Shown on receipts'),
    ] as never);
    setup();
    const money = await screen.findByRole('region', { name: 'Money' });
    expect(within(money).getByText('Default hourly price')).toBeInTheDocument();
    expect(within(money).getByText('₱500')).toBeInTheDocument();
    const bookings = screen.getByRole('region', { name: 'Bookings' });
    expect(within(bookings).getByText('Hold length')).toBeInTheDocument();
    expect(within(bookings).getByText('15').closest('p')).toHaveTextContent('15 min');
    // An unknown key keeps its raw name, under Other.
    expect(
      within(screen.getByRole('region', { name: 'Other' })).getByText('brand_name'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Accounts/ })).not.toBeInTheDocument();
  });

  it('marks an edited card unsaved, and Reset puts the value back', async () => {
    const u = userEvent.setup();
    api.list.mockResolvedValue(rows() as never);
    setup();
    const input = await screen.findByLabelText('hold_duration_minutes');
    await u.clear(input);
    await u.type(input, '20');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input).toHaveValue(15);
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
  });

  it('shows Not available without PARAMETER:Manage', async () => {
    setup(['BOOKING:ReadAny']);
    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });
});
