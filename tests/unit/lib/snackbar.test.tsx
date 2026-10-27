import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify, Snackbars } from '@/components/ui/snackbar';

afterEach(() => {
  act(() => notify.dismissAll());
});

describe('Snackbar', () => {
  it('announces a success politely, with its message', async () => {
    render(<Snackbars />);
    act(() => notify.success('Permissions saved.'));
    const item = await screen.findByRole('status');
    expect(item).toHaveTextContent('Permissions saved.');
  });

  it('announces an error as an alert', async () => {
    render(<Snackbars />);
    act(() => notify.error('That hour was just taken.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('That hour was just taken.');
  });

  it('runs its action once, then closes', async () => {
    const u = userEvent.setup();
    const onUndo = vi.fn();
    render(<Snackbars />);
    act(() => notify.info('Group deleted.', { action: { label: 'Undo', onClick: onUndo } }));
    await u.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('Group deleted.')).not.toBeInTheDocument());
  });

  it('can be dismissed', async () => {
    const u = userEvent.setup();
    render(<Snackbars />);
    act(() => notify.warning('Your session expired.'));
    await u.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(screen.queryByText('Your session expired.')).not.toBeInTheDocument(),
    );
  });
});
