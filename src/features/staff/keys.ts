export const staffKeys = {
  all: ['staff'] as const,
  myVenues: () => [...staffKeys.all, 'my-venues'] as const,
};
