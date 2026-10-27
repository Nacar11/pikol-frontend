import { ApiClient, apiClient } from '@/lib/api-client';
import { UserPageSchema, UserSchema, type Invite, type User, type UserPage } from './schemas';

const PAGE_SIZE = 20;

export const teamApi = {
  /** `q` matches name or email on the server; blank lists everyone. */
  list(page: number, q = '', client: ApiClient = apiClient()): Promise<UserPage> {
    return client
      .get<unknown>('/admin/users', {
        params: { page, limit: PAGE_SIZE, ...(q ? { q } : {}) },
      })
      .then((r) => UserPageSchema.parse(r));
  },

  /** A staff group at the active venue (`POST /admin/venue-staff`), or — for
   * the owner — any group (`POST /admin/users`). The body is exactly the
   * typed fields: nothing is spread in. */
  invite(req: Invite, asOwner: boolean, client: ApiClient = apiClient()): Promise<User> {
    const body: Invite = {
      email: req.email,
      first_name: req.first_name,
      last_name: req.last_name,
      ...(req.mobile ? { mobile: req.mobile } : {}),
      group_id: req.group_id,
    };
    return client
      .post<unknown>(asOwner ? '/admin/users' : '/admin/venue-staff', body)
      .then((r) => UserSchema.parse(r));
  },

  update(id: number, body: { is_active: boolean }, client: ApiClient = apiClient()): Promise<User> {
    return client
      .patch<unknown>(`/admin/users/${id}`, { is_active: body.is_active })
      .then((r) => UserSchema.parse(r));
  },

  resend(id: number, client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>(`/admin/users/${id}/invitation`);
  },

  revoke(id: number, client: ApiClient = apiClient()): Promise<void> {
    return client.delete<void>(`/admin/users/${id}/invitation`);
  },
};
