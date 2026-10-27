export const checkoutKeys = {
  all: ['checkouts'] as const,
  list: (page: number) => [...checkoutKeys.all, 'list', page] as const,
  lists: () => [...checkoutKeys.all, 'list'] as const,
  detail: (id: number) => [...checkoutKeys.all, 'detail', id] as const,
};
