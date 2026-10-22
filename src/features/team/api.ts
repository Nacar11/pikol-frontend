import { ApiClient, apiClient } from '@/lib/api-client';
import {
  UserPageSchema,
  UserSchema,
  type AnyInvite,
  type StaffInvite,
  type User,
  type UserPage,
} from './schemas';

const PAGE_SIZE = 20;

export const teamApi = {
  list(page: number, client: ApiClient = apiClient()): Promise<UserPage> {
    return client
      .get<unknown>('/admin/users', { params: { page, limit: PAGE_SIZE } })
      .then((r) => UserPageSchema.parse(r));
  },

  /** The body is exactly the typed fields: nothing is spread in. */
  inviteStaff(req: StaffInvite, client: ApiClient = apiClient()): Promise<User> {
    const body: StaffInvite = {
      email: req.email,
      first_name: req.first_name,
      last_name: req.last_name,
      ...(req.mobile ? { mobile: req.mobile } : {}),
    };
    return client.post<unknown>('/admin/venue-staff', body).then((r) => UserSchema.parse(r));
  },

  inviteAny(req: AnyInvite, client: ApiClient = apiClient()): Promise<User> {
    const body: AnyInvite = {
      email: req.email,
      first_name: req.first_name,
      last_name: req.last_name,
      ...(req.mobile ? { mobile: req.mobile } : {}),
      role: req.role,
      venue_id: req.venue_id,
    };
    return client.post<unknown>('/admin/users', body).then((r) => UserSchema.parse(r));
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
