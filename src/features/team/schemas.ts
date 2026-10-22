import { z } from 'zod';
import { pageSchema } from '@/lib/page';

/** Mirrors the backend's UserOut — snake_case, exactly. */
export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  mobile: z.string().nullable(),
  role: z.enum(['SUPER_ADMIN', 'VENUE_MANAGER', 'VENUE_STAFF', 'PLAYER']),
  venue_id: z.number().nullable(),
  is_active: z.boolean(),
  email_verified_at: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;
export const UserPageSchema = pageSchema(UserSchema);
export type UserPage = z.infer<typeof UserPageSchema>;

/** The manager's invite (`POST /admin/venue-staff`). Role and venue are not
 * fields of this type: the server fixes both (spec §6.4). */
export type StaffInvite = {
  email: string;
  first_name: string;
  last_name: string;
  mobile?: string;
};

/** The owner's invite (`POST /admin/users`), where choosing is legitimate. */
export type AnyInvite = StaffInvite & {
  role: 'VENUE_MANAGER' | 'VENUE_STAFF';
  venue_id: number;
};

export const ROLE_LABELS: Record<User['role'], string> = {
  SUPER_ADMIN: 'Owner',
  VENUE_MANAGER: 'Manager',
  VENUE_STAFF: 'Staff',
  PLAYER: 'Player',
};
