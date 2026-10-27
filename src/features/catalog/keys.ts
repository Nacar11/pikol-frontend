export const catalogKeys = {
  all: ['catalog'] as const,
  courts: (venueId: number) => [...catalogKeys.all, 'courts', venueId] as const,
};
