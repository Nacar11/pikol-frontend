'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { useResendVerification } from '../hooks/use-auth-mutations';

/** One-tap resend, so nobody is stranded by a spam-foldered email (§6.6). */
export function ResendVerification({
  email,
  label = 'Resend verification email',
}: {
  email: string;
  label?: string;
}) {
  const resend = useResendVerification();
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={resend.isPending}
      onClick={() =>
        resend.mutate(email, {
          onSuccess: () => toast.success(`If ${email} needs verifying, a new link is on its way.`),
          onError: (err) => toast.error(errorMessage(err)),
        })
      }
    >
      {label}
    </Button>
  );
}
