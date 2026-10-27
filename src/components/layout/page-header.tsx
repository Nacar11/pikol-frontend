import { cn } from '@/lib/cn';

/**
 * The top of a console page: a section breadcrumb, the title, one line of
 * context and the page's one primary action on the right.
 */
export function PageHeader({
  section,
  title,
  description,
  action,
  className,
}: {
  section: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0 space-y-2">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <li>{section}</li>
            <li aria-hidden>/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}
