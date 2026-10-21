import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { ResendVerification } from './resend-verification';

export function CheckEmail({ email }: { email: string }) {
  return (
    <div className="space-y-4 text-center">
      <MailCheck aria-hidden className="mx-auto size-10 text-primary" />
      <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
        Open it to activate your account. Nothing there? Check spam, or send another.
      </p>
      <ResendVerification email={email} label="Resend the link" />
      <p className="text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
