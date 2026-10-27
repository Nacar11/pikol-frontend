import { z } from 'zod';
import { GroupKindSchema } from '@/features/auth';
import { pageSchema, type Page } from '@/lib/page';

/** GET /admin/user-groups — `read_only` is from the caller's side: a master
 * group is the owner's to edit (ADR 0003). */
export const GroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: GroupKindSchema,
  venue_id: z.number().nullable(),
  member_count: z.number(),
  permissions: z.array(z.string()),
  read_only: z.boolean(),
});
export type Group = z.infer<typeof GroupSchema>;
export const GroupPageSchema = pageSchema(GroupSchema);
export type GroupPage = Page<Group>;

export const MemberSchema = z.object({
  user_id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_active: z.boolean(),
  pending_invite: z.boolean(),
  is_customer: z.boolean(),
  added_at: z.string(),
});
export type Member = z.infer<typeof MemberSchema>;
export const MemberPageSchema = pageSchema(MemberSchema);
export type MemberPage = Page<Member>;

export const PermissionSchema = z.object({
  code: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string().nullable(),
  owner_only: z.boolean(),
});
export type Permission = z.infer<typeof PermissionSchema>;

export type GroupListParams = { venue_id?: number; kind?: 'CUSTOMER' | 'MASTER' | 'STAFF' };
