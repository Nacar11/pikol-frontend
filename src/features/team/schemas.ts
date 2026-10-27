import { z } from 'zod';
import { UserSchema, type User } from '@/features/auth';
import { pageSchema } from '@/lib/page';

export { UserSchema, type User };
export const UserPageSchema = pageSchema(UserSchema);
export type UserPage = z.infer<typeof UserPageSchema>;

/** An invitation into one group (ADR 0003). There is no venue or role: the
 * venue is the group's, and the server checks the caller may fill it. */
export type Invite = {
  email: string;
  first_name: string;
  last_name: string;
  mobile?: string;
  group_id: number;
};

/** A person's staff groups at the venue in view — the API already filters
 * out other venues, so only Customer needs dropping here. */
export function staffGroupsOf(user: User): string {
  const names = user.groups.filter((g) => g.kind !== 'CUSTOMER').map((g) => g.name);
  return names.length > 0 ? names.join(', ') : 'No staff group';
}
