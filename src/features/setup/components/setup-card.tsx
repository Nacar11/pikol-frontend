import { AddTile } from '@/components/ui/add-tile';
import { StatStrip, type Stat } from '@/components/ui/stat-strip';

/** One Courts or Venues card: heading area, stat strip, action bar. */
export function SetupCard({
  head,
  stats,
  actions,
}: {
  head: React.ReactNode;
  stats: Stat[];
  actions: React.ReactNode;
}) {
  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="space-y-4 p-5">{head}</div>
      <StatStrip items={stats} />
      <div className="mt-auto flex flex-wrap gap-2 p-4">{actions}</div>
    </li>
  );
}

/** The grid's closing tile: a dashed button that opens `form` in place. */
export function AddCard({
  title,
  hint,
  open,
  onOpen,
  children,
}: {
  title: string;
  hint: string;
  open: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="min-h-64">
      {open ? (
        <div className="flex h-full flex-col justify-center gap-3 rounded-lg border border-dashed border-input p-5">
          {children}
        </div>
      ) : (
        <AddTile title={title} hint={hint} onClick={onOpen} />
      )}
    </li>
  );
}
