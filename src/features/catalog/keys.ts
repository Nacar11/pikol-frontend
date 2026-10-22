export const catalogKeys = {
  all: ['catalog'] as const,
  venues: () => [...catalogKeys.all, 'venues'] as const,
};
