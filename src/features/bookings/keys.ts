export const bookingKeys = {
  all: ['bookings'] as const,
  mine: () => [...bookingKeys.all, 'mine'] as const,
  detail: (id: number) => [...bookingKeys.all, 'detail', id] as const,
  checkout: (id: number) => [...bookingKeys.all, 'checkout', id] as const,
};
