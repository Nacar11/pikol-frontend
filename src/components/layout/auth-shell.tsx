import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span aria-hidden className="size-3 rounded-full bg-accent ring-2 ring-primary" />
      Pikol
    </Link>
  );
}

/** The frame for every (auth) screen: brand, one card, one job. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center">
      <div className="mb-8">
        <Brand />
      </div>
      <main className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
