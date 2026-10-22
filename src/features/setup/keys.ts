export const setupKeys = {
  all: ['setup'] as const,
  venues: () => [...setupKeys.all, 'venues'] as const,
  courts: (venueId: number) => [...setupKeys.all, 'courts', venueId] as const,
  rules: (courtId: number) => [...setupKeys.all, 'rules', courtId] as const,
  prices: (courtId: number, date: string) => [...setupKeys.all, 'prices', courtId, date] as const,
};
