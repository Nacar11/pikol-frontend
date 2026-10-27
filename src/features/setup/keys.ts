export const setupKeys = {
  all: ['setup'] as const,
  venues: () => [...setupKeys.all, 'venues'] as const,
  courts: (venueId: number) => [...setupKeys.all, 'courts', venueId] as const,
  court: (courtId: number) => [...setupKeys.all, 'court', courtId] as const,
  rules: (courtId: number) => [...setupKeys.all, 'rules', courtId] as const,
  /** Every date of a court: a prefix for invalidation. */
  allPrices: (courtId: number) => [...setupKeys.all, 'prices', courtId] as const,
  prices: (courtId: number, date: string) => [...setupKeys.all, 'prices', courtId, date] as const,
  summaries: () => [...setupKeys.all, 'summaries'] as const,
  courtSummaries: (venueId: number) => [...setupKeys.summaries(), 'courts', venueId] as const,
  venueSummaries: () => [...setupKeys.summaries(), 'venues'] as const,
};
