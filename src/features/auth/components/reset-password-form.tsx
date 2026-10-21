'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useResetPassword } from '../hooks/use-auth-mutations';
import { NewPasswordForm } from './new-password-form';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const reset = useResetPassword();
  const router = useRouter();

  return (
    <NewPasswordForm
      token={token}
      title="Choose a new password"
      subtitle="You will be signed out everywhere else."
      submitLabel="Set new password"
      pending={reset.isPending}
      error={reset.error}
      recovery={{ href: '/forgot-password', label: 'Request a new reset link' }}
      onSubmit={(password) =>
        reset.mutate(
          { token: token!, password },
          {
            onSuccess: () => {
              toast.success('Password changed. Sign in with your new password.');
              router.replace('/login');
            },
          },
        )
      }
    />
  );
}
