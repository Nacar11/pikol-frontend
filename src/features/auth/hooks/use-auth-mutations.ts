'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api';
import { authKeys } from '../keys';
import type { RegisterInput } from '../schemas';

// Every auth write, as named hooks: components never call api.ts directly.

export const useRegister = () =>
  useMutation({ mutationFn: (input: RegisterInput) => authApi.register(input) });

export const useResendVerification = () =>
  useMutation({ mutationFn: (email: string) => authApi.resendVerification(email) });

export const useVerifyEmail = () =>
  useMutation({ mutationFn: (token: string) => authApi.verifyEmail(token) });

export const useForgotPassword = () =>
  useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
  });

export const useAcceptInvitation = () =>
  useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.acceptInvitation(token, password),
  });

/** Fetch (and cache) the signed-in user's permissions — for landing right
 * after login, before any component has asked for them. */
export function useFetchPermissions() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.fetchQuery({
      queryKey: authKeys.permissions(),
      queryFn: () => authApi.permissions(),
    });
}
