import { ApiClient, apiClient } from '@/lib/api-client';
import {
  AuthUserSchema,
  PermissionsSchema,
  TokenPairSchema,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
  type TokenPair,
} from './schemas';

/**
 * /auth/* and /users/me wrappers. Every response is zod-parsed, so contract
 * drift fails here rather than deep in a render. Auth calls skip the
 * refresh-on-401 retry: a 401 from them is the answer, not an expiry.
 */
export const authApi = {
  login(input: LoginInput, client: ApiClient = apiClient()): Promise<TokenPair> {
    return client
      .post<unknown>('/auth/login', input, { skipRefresh: true })
      .then((r) => TokenPairSchema.parse(r));
  },

  /** ROTATES the token: the one passed in dies. Call only from AuthProvider. */
  refresh(refreshToken: string, client: ApiClient = apiClient()): Promise<TokenPair> {
    return client
      .post<unknown>('/auth/refresh', { refresh_token: refreshToken }, { skipRefresh: true })
      .then((r) => TokenPairSchema.parse(r));
  },

  logout(client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>('/auth/logout');
  },

  me(client: ApiClient = apiClient()): Promise<AuthUser> {
    return client.get<unknown>('/users/me').then((r) => AuthUserSchema.parse(r));
  },

  permissions(client: ApiClient = apiClient()): Promise<string[]> {
    return client.get<unknown>('/users/me/permissions').then((r) => PermissionsSchema.parse(r));
  },

  register(input: RegisterInput, client: ApiClient = apiClient()): Promise<AuthUser> {
    // confirm_password is a form concern; the backend forbids unknown fields.
    const body = {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
      ...(input.mobile ? { mobile: input.mobile } : {}),
    };
    return client
      .post<unknown>('/auth/register', body, { skipRefresh: true })
      .then((r) => AuthUserSchema.parse(r));
  },

  verifyEmail(token: string, client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>('/auth/verify-email', { token }, { skipRefresh: true });
  },

  resendVerification(email: string, client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>('/auth/verify-email/resend', { email }, { skipRefresh: true });
  },

  forgotPassword(email: string, client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>('/auth/password/forgot', { email }, { skipRefresh: true });
  },

  resetPassword(token: string, password: string, client: ApiClient = apiClient()): Promise<void> {
    return client.post<void>(
      '/auth/password/reset',
      { token, new_password: password },
      { skipRefresh: true },
    );
  },

  acceptInvitation(
    token: string,
    password: string,
    client: ApiClient = apiClient(),
  ): Promise<void> {
    return client.post<void>(
      '/auth/invitations/accept',
      { token, password },
      { skipRefresh: true },
    );
  },
};
