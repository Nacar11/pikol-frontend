'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Field } from '@/components/form/field';
import { Alert } from '@/components/ui/alert';
import { PageLoading } from '@/components/ui/page-loading';
import { errorMessage } from '@/lib/api-error';
import { useVerifyEmail } from '../hooks/use-auth-mutations';
import { ResendVerification } from './resend-verification';

export function VerifyEmail() {
  const token = useSearchParams().get('token');
  const verify = useVerifyEmail();
  const [email, setEmail] = useState('');
  const sent = useRef(false);

  // The token is single-use: StrictMode's second effect run would spend it
  // again and turn a success into "invalid link". Fire once.
  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);

  if (verify.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-10 text-success" />
        <h1 className="text-xl font-semibold tracking-tight">Email verified</h1>
        <p className="text-sm text-muted-foreground">Your account is active. Sign in to book.</p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (token && !verify.isError) return <PageLoading label="Verifying your email" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Verify your email</h1>
      <Alert tone="error">
        {token
          ? errorMessage(verify.error, 'This link is invalid or has expired.')
          : 'This verification link is missing its token.'}
      </Alert>
      <p className="text-sm text-muted-foreground">Enter your email and we will send a new link.</p>
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ResendVerification email={email.trim()} label="Send a new link" />
    </div>
  );
}
