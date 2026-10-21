export const authKeys = {
  all: ['auth'] as const,
  permissions: () => [...authKeys.all, 'permissions'] as const,
};
