import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

const alertVariants = cva('flex gap-3 rounded border p-3 text-sm', {
  variants: {
    tone: {
      error: 'border-destructive/30 bg-destructive/5 text-destructive',
      info: 'border-border bg-muted text-foreground',
      success: 'border-success/30 bg-success/5 text-success',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ICONS = { error: AlertCircle, info: Info, success: CheckCircle2 };

/** Errors are role="alert" (announced at once); others are role="status". */
export function Alert({
  tone = 'info',
  className,
  children,
}: VariantProps<typeof alertVariants> & { className?: string; children: React.ReactNode }) {
  const Icon = ICONS[tone ?? 'info'];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-2">{children}</div>
    </div>
  );
}
