import { z } from 'zod';

export const GroupKindSchema = z.enum(['CUSTOMER', 'MASTER', 'STAFF']);

const GroupRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: GroupKindSchema,
  venue_id: z.number().nullable(),
});

/** Mirrors the backend's UserOut — snake_case, exactly. There is no role:
 * what someone may do is their groups, and the UI gates on permissions. */
export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  mobile: z.string().nullable(),
  is_active: z.boolean(),
  email_verified_at: z.string().nullable(),
  groups: z.array(GroupRefSchema),
});

export type User = z.infer<typeof UserSchema>;

export const AuthUserSchema = UserSchema.extend({ is_customer: z.boolean() });
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const TokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const PermissionsSchema = z.array(z.string());

const email = z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.');
const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Use at most 128 characters.');

export const LoginInputSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const EmailInputSchema = z.object({ email });
export type EmailInput = z.infer<typeof EmailInputSchema>;

export const NewPasswordInputSchema = z
  .object({ password: newPassword, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });
export type NewPasswordInput = z.infer<typeof NewPasswordInputSchema>;
