import { z } from 'zod';
import { UserSchema, type User } from '@/features/auth';
import { ApiClient, apiClient } from '@/lib/api-client';
import { pageSchema, type Page } from '@/lib/page';
import {
  GroupPageSchema,
  GroupSchema,
  MemberPageSchema,
  MemberSchema,
  PermissionSchema,
  type Group,
  type GroupListParams,
  type GroupPage,
  type Member,
  type MemberPage,
  type Permission,
} from './schemas';

const LIMIT = 200;
const MEMBER_PAGE = 50;

export const groupsApi = {
  list(params: GroupListParams, client: ApiClient = apiClient()): Promise<GroupPage> {
    return client
      .get<unknown>('/admin/user-groups', { params: { ...params, limit: LIMIT } })
      .then((r) => GroupPageSchema.parse(r));
  },

  /** `venue_id` only for the owner; the server refuses it from anyone else. */
  create(
    body: { name: string; venue_id?: number },
    client: ApiClient = apiClient(),
  ): Promise<Group> {
    return client.post<unknown>('/admin/user-groups', body).then((r) => GroupSchema.parse(r));
  },

  rename(id: number, name: string, client: ApiClient = apiClient()): Promise<Group> {
    return client
      .patch<unknown>(`/admin/user-groups/${id}`, { name })
      .then((r) => GroupSchema.parse(r));
  },

  remove(id: number, client: ApiClient = apiClient()): Promise<void> {
    return client.delete<void>(`/admin/user-groups/${id}`);
  },

  /** The whole checkbox state; codes the caller does not hold are kept. */
  setPermissions(id: number, codes: string[], client: ApiClient = apiClient()): Promise<Group> {
    return client
      .put<unknown>(`/admin/user-groups/${id}/permissions`, { codes })
      .then((r) => GroupSchema.parse(r));
  },

  members(id: number, page: number, client: ApiClient = apiClient()): Promise<MemberPage> {
    return client
      .get<unknown>(`/admin/user-groups/${id}/members`, { params: { page, limit: MEMBER_PAGE } })
      .then((r) => MemberPageSchema.parse(r));
  },

  /** By exact email: finds one person and lists nobody else. */
  addMember(id: number, email: string, client: ApiClient = apiClient()): Promise<Member> {
    return client
      .post<unknown>(`/admin/user-groups/${id}/members`, { email })
      .then((r) => MemberSchema.parse(r));
  },

  removeMember(id: number, userId: number, client: ApiClient = apiClient()): Promise<void> {
    return client.delete<void>(`/admin/user-groups/${id}/members/${userId}`);
  },

  /** Owner only: anyone by name or email, for the Customer group. */
  searchUsers(q: string, client: ApiClient = apiClient()): Promise<Page<User>> {
    return client
      .get<unknown>('/admin/users', { params: { q, limit: 20 } })
      .then((r) => pageSchema(UserSchema).parse(r));
  },

  catalogue(client: ApiClient = apiClient()): Promise<Permission[]> {
    return client
      .get<unknown>('/admin/permissions')
      .then((r) => z.array(PermissionSchema).parse(r));
  },
};
