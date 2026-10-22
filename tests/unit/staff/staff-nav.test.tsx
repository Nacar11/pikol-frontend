import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { StaffNav } from '@/features/staff';
import { renderWithAuth } from '../auth/render';

vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/staff/closures' }));

const STAFF = [
  'BOOKING:ReadAny',
  'BOOKING:CreateWalkIn',
  'BOOKING:MarkPaid',
  'BOOKING:SetOutcome',
  'BOOKING:CancelAny',
  'CLOSURE:Manage',
];
const ALL = [
  ...STAFF,
  'COURT:Manage',
  'PRICE:Manage',
  'USER:Manage',
  'VENUE:Manage',
  'PARAMETER:Manage',
];

describe('StaffNav', () => {
  it('shows only the links the staff permissions allow', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue(STAFF);
    renderWithAuth(<StaffNav />, { status: 'authenticated' });

    expect(await screen.findByRole('link', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'To resolve' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Closures' })).toHaveAttribute('aria-current', 'page');
    for (const hidden of ['Courts', 'Staff', 'Venues', 'Parameters']) {
      expect(screen.queryByRole('link', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('shows all seven for the full permission set, in order', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue(ALL);
    renderWithAuth(<StaffNav />, { status: 'authenticated' });

    await screen.findByRole('link', { name: 'Schedule' });
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Schedule',
      'To resolve',
      'Closures',
      'Courts',
      'Staff',
      'Venues',
      'Parameters',
    ]);
  });
});
