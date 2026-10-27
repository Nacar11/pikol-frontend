import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/features/auth/api';
import { StaffOnly } from '@/features/staff';
import { renderWithAuth, router } from '../auth/render';

vi.mock('@/features/auth/api', () => ({ authApi: { permissions: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

beforeEach(() => vi.clearAllMocks());

describe('StaffOnly', () => {
  it('sends a non-staff user who follows a staff link to the booking home', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue([]);
    renderWithAuth(<StaffOnly>console</StaffOnly>, { status: 'authenticated' });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/book'));
    expect(screen.queryByText('console')).not.toBeInTheDocument();
  });

  it('lets staff through', async () => {
    vi.mocked(authApi.permissions).mockResolvedValue(['BOOKING:ReadAny']);
    renderWithAuth(<StaffOnly>console</StaffOnly>, { status: 'authenticated' });

    expect(await screen.findByText('console')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
