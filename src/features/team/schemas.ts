import { z } from 'zod';
import { UserSchema, type User } from '@/features/auth';
import { pageSchema } from '@/lib/page';

export { UserSchema, type User };
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

/** A person's staff groups at the venue in view — the API already filters
 * out other venues, so only Customer needs dropping here. */
export function staffGroupsOf(user: User): string {
  const names = user.groups.filter((g) => g.kind !== 'CUSTOMER').map((g) => g.name);
  return names.length > 0 ? names.join(', ') : 'No staff group';
}
