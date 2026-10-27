import type { GroupListParams } from './schemas';

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (params: GroupListParams) => [...groupKeys.lists(), params] as const,
  members: (groupId: number) => [...groupKeys.all, 'members', groupId] as const,
  catalogue: () => [...groupKeys.all, 'catalogue'] as const,
};
