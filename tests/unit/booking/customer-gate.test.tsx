import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerGate } from '@/features/booking';
import { renderWithAuth } from '../auth/render';

vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

describe('CustomerGate', () => {
  it('lets a customer through', () => {
    renderWithAuth(<CustomerGate>booking</CustomerGate>, {
      status: 'authenticated',
      user: { is_customer: true } as never,
    });
    expect(screen.getByText('booking')).toBeInTheDocument();
  });

  it('tells an account outside the Customer group that it cannot book', () => {
    renderWithAuth(<CustomerGate>booking</CustomerGate>, {
      status: 'authenticated',
      user: { is_customer: false } as never,
    });
    expect(
      screen.getByRole('heading', { name: "This account can't book courts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByText('booking')).not.toBeInTheDocument();
  });
});
