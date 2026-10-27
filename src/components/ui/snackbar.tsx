'use client';

import { AlertTriangle, CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';

type Tone = 'success' | 'info' | 'warning' | 'error';

type Options = {
  action?: { label: string; onClick: () => void };
  /** Milliseconds on screen; errors and warnings stay longer by default. */
  duration?: number;
};

const ICONS = { success: CircleCheck, info: Info, warning: AlertTriangle, error: CircleAlert };
const DURATION: Record<Tone, number> = { success: 4000, info: 4000, warning: 6000, error: 6000 };

function show(tone: Tone, message: string, options: Options = {}) {
  toast.custom((id) => <Snackbar id={id} tone={tone} message={message} action={options.action} />, {
    duration: options.duration ?? DURATION[tone],
  });
}

/** The one way the console tells someone something happened. */
export const notify = {
  success: (message: string, options?: Options) => show('success', message, options),
  info: (message: string, options?: Options) => show('info', message, options),
  warning: (message: string, options?: Options) => show('warning', message, options),
  error: (message: string, options?: Options) => show('error', message, options),
  dismissAll: () => toast.dismiss(),
};

/** Mounted once, in the app providers. */
export function Snackbars() {
  return <Toaster position="bottom-center" visibleToasts={3} gap={8} offset={16} />;
}

function Snackbar({
  id,
  tone,
  message,
  action,
}: {
  id: string | number;
  tone: Tone;
  message: string;
  action?: Options['action'];
}) {
  const Icon = ICONS[tone];
  return (
    <div
      // Errors interrupt; everything else waits for a pause. Neither moves focus.
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex w-[min(calc(100vw-2rem),26rem)] items-center gap-3 rounded-md bg-neutral-950 py-2 pl-4 pr-2 text-sm text-white shadow-lg"
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 py-1.5">{message}</p>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            toast.dismiss(id);
          }}
          className="shrink-0 rounded px-2 py-1.5 font-semibold underline-offset-4 hover:underline focus-visible:ring-white focus-visible:ring-offset-neutral-950"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => toast.dismiss(id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:ring-white focus-visible:ring-offset-neutral-950"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
