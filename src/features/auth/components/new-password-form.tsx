'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Field } from '@/components/form/field';
import { AuthHeading } from '@/components/layout/auth-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-error';
import { NewPasswordInputSchema, type NewPasswordInput } from '../schemas';

export function NewPasswordForm({
  token,
  title,
  subtitle,
  submitLabel,
  pending,
  error,
  onSubmit,
  recovery,
}: {
  token: string | null;
  title: string;
  subtitle: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (password: string) => void;
  recovery: { href: string; label: string };
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(NewPasswordInputSchema) });

  if (!token) {
    return (
      <div className="space-y-4">
        <AuthHeading title={title} />
        <Alert tone="error">
          This link is missing its token. Open the link from your email again.
        </Alert>
        <Link href={recovery.href} className="text-sm text-primary hover:underline">
          {recovery.label}
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={title} subtitle={subtitle} />
      <form
        onSubmit={handleSubmit(({ password }) => onSubmit(password))}
        noValidate
        className="space-y-4"
      >
        {error != null && (
          <Alert tone="error">
            <p>{errorMessage(error)}</p>
            <Link href={recovery.href} className="font-medium underline">
              {recovery.label}
            </Link>
          </Alert>
        )}
        <Field
          label="New password"
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
        <Button type="submit" size="full" loading={pending}>
          {submitLabel}
        </Button>
      </form>
    </>
  );
}
