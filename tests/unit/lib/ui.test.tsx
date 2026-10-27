import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddTile } from '@/components/ui/add-tile';
import { Avatar } from '@/components/ui/avatar';
import { SectionLabel } from '@/components/ui/section-label';
import { StatStrip } from '@/components/ui/stat-strip';
import { VenueRequired } from '@/features/staff';
import { staffApi } from '@/features/staff/api';
import { renderWithAuth, setSearch } from '../auth/render';

vi.mock('@/features/staff/api', () => ({ staffApi: { myVenues: vi.fn() } }));
vi.mock('next/navigation', async () => (await import('../auth/render')).navigationMock);

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('');
});

describe('shared UI', () => {
  it('SectionLabel numbers a section without announcing the number', () => {
    render(
      <SectionLabel n={3} aside="2 settings">
        Bookings
      </SectionLabel>,
    );
    expect(screen.getByText('03')).toHaveAttribute('aria-hidden');
    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('2 settings')).toBeInTheDocument();
  });

  it('StatStrip pairs labels with values and draws a meter only when given', () => {
    const { container } = render(
      <StatStrip
        items={[
          { label: 'Rate now', value: '₱500' },
          { label: 'Booked today', value: '6 h', meter: 0.25 },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Rate now',
      'Booked today',
    ]);
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['₱500', '6 h']);
    const bars = container.querySelectorAll('[data-meter]');
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveStyle({ width: '25%' });
  });

  it('Avatar shows initials', () => {
    render(<Avatar first="Ana" last="Lim" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('AddTile is one button named by its title', async () => {
    const onClick = vi.fn();
    render(<AddTile title="Add court" hint="Appears as column 4" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Add court/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it('VenueRequired renders its child with the active venue once loaded', async () => {
    vi.mocked(staffApi.myVenues).mockResolvedValue([
      { venue_id: 4, name: 'Riverside', is_master: true, groups: [] },
    ]);
    renderWithAuth(<VenueRequired>{(id) => <p>venue {id}</p>}</VenueRequired>, {
      status: 'authenticated',
    });
    expect(await screen.findByText('venue 4')).toBeInTheDocument();
  });

  it('VenueRequired says so when the caller has no venue', async () => {
    vi.mocked(staffApi.myVenues).mockResolvedValue([]);
    renderWithAuth(<VenueRequired>{() => <p>never</p>}</VenueRequired>, {
      status: 'authenticated',
    });
    expect(await screen.findByText('No venues yet.')).toBeInTheDocument();
  });
});
