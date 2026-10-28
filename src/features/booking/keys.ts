export const checkoutKeys = {
  all: ['checkouts'] as const,
  list: (page: number) => [...checkoutKeys.all, 'list', page] as const,
  lists: () => [...checkoutKeys.all, 'list'] as const,
  detail: (id: number) => [...checkoutKeys.all, 'detail', id] as const,
  /** `version` is the checkout's state: a new one fetches the events again. */
  events: (id: number, version: string) => [...checkoutKeys.detail(id), 'events', version] as const,
};
