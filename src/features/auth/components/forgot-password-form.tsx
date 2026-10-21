'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Field } from '@/components/form/field';
import { AuthHeading } from '@/components/layout/auth-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { useForgotPassword } from '../hooks/use-auth-mutations';
import { EmailInputSchema, type EmailInput } from '../schemas';

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EmailInput>({ resolver: zodResolver(EmailInputSchema) });

  if (forgot.isSuccess) {
    // The backend answers the same for every email, so we do too.
    return (
      <div className="space-y-4">
        <AuthHeading title="Check your email" />
        <Alert tone="success">
          If an account exists for {getValues('email')}, we sent a link to reset its password. It
          expires in 60 minutes.
        </Alert>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Reset your password" subtitle="We will email you a link." />
      <form
        onSubmit={handleSubmit(({ email }) => forgot.mutate(email))}
        noValidate
        className="space-y-4"
      >
        {forgot.isError && <Alert tone="error">{errorMessage(forgot.error)}</Alert>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="full" loading={forgot.isPending}>
          Send reset link
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}
