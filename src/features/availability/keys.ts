export const availabilityKeys = {
  all: ['availability'] as const,
  day: (venueId: number, date: string) => [...availabilityKeys.all, venueId, date] as const,
};
