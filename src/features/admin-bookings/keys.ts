import type { ListParams } from './schemas';

export const adminBookingKeys = {
  all: ['admin-bookings'] as const,
  day: (venueId: number, date: string) => [...adminBookingKeys.all, 'day', venueId, date] as const,
  detail: (id: number) => [...adminBookingKeys.all, 'detail', id] as const,
  events: (id: number) => [...adminBookingKeys.detail(id), 'events'] as const,
  occupancyAll: () => [...adminBookingKeys.all, 'occupancy'] as const,
  occupancy: (venueId: number, from: string, days: number) =>
    [...adminBookingKeys.occupancyAll(), venueId, from, days] as const,
  unfulfilled: () => [...adminBookingKeys.all, 'unfulfilled'] as const,
  list: (params: ListParams) => [...adminBookingKeys.all, 'list', params] as const,
};
