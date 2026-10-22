export const bookingKeys = {
  all: ['bookings'] as const,
  mine: () => [...bookingKeys.all, 'mine'] as const,
  detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
  checkouts: () => [...bookingKeys.all, 'checkout'] as const,
  checkout: (id: number) => [...bookingKeys.checkouts(), id] as const,
};
