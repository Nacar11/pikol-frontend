'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAcceptInvitation } from '../hooks/use-auth-mutations';
import { NewPasswordForm } from './new-password-form';

/** Staff set their OWN password — the manager never knows it (spec §6.6). */
export function AcceptInviteForm() {
  const token = useSearchParams().get('token');
  const accept = useAcceptInvitation();
  const router = useRouter();

  return (
    <NewPasswordForm
      token={token}
      title="Join your venue on Pikol"
      subtitle="Set a password to activate your staff account."
      submitLabel="Activate account"
      pending={accept.isPending}
      error={accept.error}
      recovery={{ href: '/login', label: 'Ask your manager to resend the invitation' }}
      onSubmit={(password) =>
        accept.mutate(
          { token: token!, password },
          {
            onSuccess: () => {
              toast.success('Account activated. Sign in to get started.');
              router.replace('/login');
            },
          },
        )
      }
    />
  );
}
