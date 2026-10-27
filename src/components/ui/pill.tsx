import { cn } from '@/lib/cn';

const TONES = {
  solid: 'bg-muted',
  outline: 'border border-input',
  dashed: 'border border-dashed border-input text-muted-foreground',
};

/** A status label. The text carries the meaning; the tone only separates it. */
export function Pill({
  tone = 'solid',
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium', TONES[tone])}
    >
      {children}
    </span>
  );
}
