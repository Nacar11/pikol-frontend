export const teamKeys = {
  all: ['team'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (q: string) => [...teamKeys.lists(), q] as const,
};
