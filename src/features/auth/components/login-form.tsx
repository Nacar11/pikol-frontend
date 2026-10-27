'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Field } from '@/components/form/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorCode, errorMessage } from '@/lib/api-error';
import { useFetchPermissions } from '../hooks/use-auth-mutations';
import { landingPath } from '../landing';
import { LoginInputSchema, type LoginInput } from '../schemas';
import { useAuth } from '../use-auth';
import { ResendVerification } from './resend-verification';

/** Only same-site paths: `//evil.example` is protocol-relative, not local. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function LoginForm() {
  const { login } = useAuth();
  const fetchPermissions = useFetchPermissions();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [failure, setFailure] = useState<{ message: string; unverified: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setFailure(null);
    try {
      await login(input);
      router.replace(next ?? landingPath(await fetchPermissions()));
    } catch (err) {
      setFailure({
        message: errorMessage(err, 'Could not sign in. Please try again.'),
        unverified: errorCode(err) === 'EMAIL_NOT_VERIFIED',
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {failure && (
        <Alert tone="error">
          <p>{failure.message}</p>
          {failure.unverified && <ResendVerification email={getValues('email')} />}
        </Alert>
      )}
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="full" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
