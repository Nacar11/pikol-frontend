'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';

// Every auth write, as named hooks: components never call api.ts directly.

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
