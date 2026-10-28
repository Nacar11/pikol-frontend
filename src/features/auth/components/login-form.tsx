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
import type { Portal } from '../auth-provider';
import { CUSTOMER_LOGIN, safeNext } from '../landing';
import { LoginInputSchema, type LoginInput } from '../schemas';
import { useAuth } from '../use-auth';
import { ResendVerification } from './resend-verification';

/** Each door lands on its own side, and a refusal points at the other one. */
const DOORS = {
  staff: { home: '/staff/schedule', refused: 'NOT_STAFF' },
  customer: { home: '/book', refused: 'NOT_A_CUSTOMER' },
} as const;

const OTHER_DOOR = {
  staff: { href: CUSTOMER_LOGIN, label: 'Customers sign in to the booking demo here' },
  customer: { href: '/login', label: 'Venue staff sign in here' },
} as const;

type Failure = { message: string; unverified: boolean; wrongDoor: boolean };

export function LoginForm({ portal = 'staff' }: { portal?: Portal }) {
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [failure, setFailure] = useState<Failure | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setFailure(null);
    try {
      await login(input, portal);
      router.replace(next ?? DOORS[portal].home);
    } catch (err) {
      setFailure({
        message: errorMessage(err, 'Could not sign in. Please try again.'),
        unverified: errorCode(err) === 'EMAIL_NOT_VERIFIED',
        wrongDoor: errorCode(err) === DOORS[portal].refused,
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {failure && (
        <Alert tone="error">
          <p>{failure.message}</p>
          {failure.unverified && <ResendVerification email={getValues('email')} />}
          {failure.wrongDoor && <OtherDoor portal={portal} />}
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

/** The link to the other sign-in page, under a refusal and at a page's foot. */
export function OtherDoor({ portal }: { portal: Portal }) {
  const door = OTHER_DOOR[portal];
  return (
    <Link href={door.href} className="text-sm text-primary hover:underline">
      {door.label}
    </Link>
  );
}
