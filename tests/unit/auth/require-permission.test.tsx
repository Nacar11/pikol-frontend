import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequirePermission } from '@/features/auth';
import { authApi } from '@/features/auth/api';
import { renderWithAuth } from './render';

vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));

describe('RequirePermission', () => {
  it('shows the page to holders of the permission', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<RequirePermission code="BOOKING:ReadAny">schedule</RequirePermission>, {
      status: 'authenticated',
    });

    expect(await screen.findByText('schedule')).toBeInTheDocument();
  });

  it('explains instead of rendering for everyone else', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue([]);
    renderWithAuth(<RequirePermission code="BOOKING:ReadAny">schedule</RequirePermission>, {
      status: 'authenticated',
    });

    expect(await screen.findByText('Not available')).toBeInTheDocument();
    expect(screen.queryByText('schedule')).not.toBeInTheDocument();
  });
});
