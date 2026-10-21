'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Field } from '@/components/form/field';
import { AuthHeading } from '@/components/layout/auth-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { useRegister } from '../hooks/use-auth-mutations';
import { RegisterInputSchema, type RegisterInput } from '../schemas';
import { CheckEmail } from './check-email';

/** Players only — staff are invited (spec §6.4). */
export function RegisterForm() {
  const registration = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterInputSchema) });

  if (registration.isSuccess) return <CheckEmail email={registration.data.email} />;

  return (
    <>
      <AuthHeading title="Create your account" subtitle="Book courts in a few taps." />
      <form
        onSubmit={handleSubmit((input) => registration.mutate(input))}
        noValidate
        className="space-y-4"
      >
        {registration.isError && (
          <Alert tone="error">
            {errorMessage(registration.error, 'Could not create the account.')}
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Field
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Mobile (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.mobile?.message}
          {...register('mobile')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />
        <Button type="submit" size="full" loading={registration.isPending}>
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
