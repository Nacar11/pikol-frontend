'use client';

import { ChevronsUpDown, MapPin } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { useStaffVenue } from '../use-staff-venue';

const LIST_WIDTH = 240;

/**
 * The active venue, at the top of the sidebar. A dropdown when the caller can
 * act at more than one venue; a plain label otherwise. Switching changes
 * what the caller may do, not only what they see — permissions are per
 * venue (ADR 0003). On the collapsed rail it shrinks to its pin, and the
 * list still opens at full width.
 */
export function VenueSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { venue, venues, canPick, setVenue } = useStaffVenue();
  if (!venue) return null;
  const detail = venue.groups.length > 0 ? venue.groups.join(', ') : 'All venues';
  const card = cn(
    'flex w-full items-center gap-3 rounded-md bg-neutral-900 px-3 py-2.5 text-neutral-100',
    collapsed && 'md:justify-center md:px-0',
  );
  const content = (
    <>
      <MapPin aria-hidden className="size-4 shrink-0 text-neutral-400" />
      <span className={cn('min-w-0 flex-1', collapsed && 'md:sr-only')}>
        <span className="block truncate text-sm font-medium">{venue.name}</span>
        <span className="block truncate text-xs text-neutral-400">{detail}</span>
      </span>
    </>
  );
  return (
    <div className={cn('px-3', collapsed && 'md:px-2')} title={collapsed ? venue.name : undefined}>
      <p
        className={cn(
          'mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500',
          collapsed && 'md:sr-only',
        )}
      >
        Venue
      </p>
      {canPick ? (
        <Select
          aria-label="Venue"
          value={String(venue.venue_id)}
          onChange={(v) => setVenue(Number(v))}
          options={venues.map((v) => ({ value: String(v.venue_id), label: v.name }))}
          minListWidth={LIST_WIDTH}
          className={cn(
            card,
            'transition-colors duration-150 hover:bg-neutral-800 focus-visible:ring-white focus-visible:ring-offset-neutral-950',
          )}
          renderTrigger={() => (
            <>
              {content}
              <ChevronsUpDown
                aria-hidden
                className={cn('size-4 shrink-0 text-neutral-400', collapsed && 'md:hidden')}
              />
            </>
          )}
        />
      ) : (
        <div className={card}>{content}</div>
      )}
    </div>
  );
}
