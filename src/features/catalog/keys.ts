export const catalogKeys = {
  all: ['catalog'] as const,
  venues: () => [...catalogKeys.all, 'venues'] as const,
  courts: (venueId: number) => [...catalogKeys.all, 'courts', venueId] as const,
};
