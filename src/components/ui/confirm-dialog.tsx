'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

export type Confirmation = {
  title: string;
  /** What will happen, in a sentence or a short list. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm, for actions that take something away (cancel a booking). */
  destructive?: boolean;
};

/**
 * A modal "are you sure?" before a decision that changes a booking. The native
 * <dialog>, opened with showModal(), makes the page behind it inert, traps
 * focus and closes on Escape without any of that hand-written. Focus starts on
 * the safe button, so a stray Enter backs out rather than acts. While the
 * action runs the dialog stays open and cannot be dismissed, then the caller
 * closes it. It renders into <body>, so a parent's `space-y-*` margin cannot
 * pull it off centre.
 */
export function ConfirmDialog({
  confirmation,
  pending,
  onConfirm,
  onClose,
}: {
  confirmation: Confirmation | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const open = confirmation !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!confirmation) return null;
  const { title, body, confirmLabel, cancelLabel = 'Go back', destructive } = confirmation;
  return createPortal(
    <dialog
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        // Escape: let React own the close, and ignore it mid-request.
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(e) => {
        // A press on the backdrop lands on the <dialog> itself.
        if (e.target === e.currentTarget && !pending) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="space-y-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div id={bodyId} className="space-y-2 text-sm text-muted-foreground">
          {body}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" autoFocus disabled={pending} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            loading={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
