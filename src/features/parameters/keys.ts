export const parameterKeys = {
  all: ['parameters'] as const,
  list: () => [...parameterKeys.all, 'list'] as const,
};
