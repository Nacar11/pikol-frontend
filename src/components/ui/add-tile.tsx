import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The dashed "add one" tile closing a grid (`lg`) or a list (`sm`). */
export function AddTile({
  title,
  hint,
  onClick,
  size = 'lg',
}: {
  title: string;
  hint: string;
  onClick: () => void;
  size?: 'lg' | 'sm';
}) {
  const lg = size === 'lg';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center rounded-lg border border-dashed border-input transition-colors duration-150 hover:bg-muted/60',
        lg ? 'size-full min-h-64 flex-col justify-center gap-3 p-5' : 'gap-3 p-4 text-left',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded border border-foreground',
          lg ? 'size-12' : 'size-9',
        )}
      >
        <Plus className={lg ? 'size-5' : 'size-4'} />
      </span>
      <span className={cn('min-w-0', lg && 'text-center')}>
        <span className={cn('block font-semibold', !lg && 'text-sm')}>{title}</span>
        <span className={cn('block text-muted-foreground', lg ? 'text-sm' : 'text-xs')}>
          {hint}
        </span>
      </span>
    </button>
  );
}
