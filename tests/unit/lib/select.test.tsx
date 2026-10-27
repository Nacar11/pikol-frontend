import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Select, type SelectOption } from '@/components/ui/select';

const OPTIONS: SelectOption[] = [
  { value: '', label: 'Any day' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday', disabled: true },
  { value: '3', label: 'Wednesday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="day">Day</label>
      <Select
        id="day"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
        options={OPTIONS}
      />
      <button type="button">elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByLabelText('Day');

describe('Select', () => {
  it('is a labelled combobox showing the chosen label, closed by default', () => {
    render(<Harness />);
    expect(trigger()).toHaveAttribute('role', 'combobox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveTextContent('Any day');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on click, marks the selected option and chooses one', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await u.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Any day' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await u.click(screen.getByRole('option', { name: 'Saturday' }));
    expect(onChange).toHaveBeenCalledWith('6');
    expect(trigger()).toHaveTextContent('Saturday');
    expect(trigger()).toHaveAttribute('data-value', '6');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('moves with the arrows, skipping disabled options, and chooses with Enter', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await u.keyboard('{ArrowDown}');
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Any day' }).id,
    );
    await u.keyboard('{ArrowDown}{ArrowDown}');
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Wednesday' }).id,
    );
    await u.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('jumps by typing and with Home and End', async () => {
    const u = userEvent.setup();
    render(<Harness />);
    trigger().focus();
    await u.keyboard('{ArrowDown}{End}');
    const active = () =>
      document.getElementById(trigger().getAttribute('aria-activedescendant') ?? '');
    expect(active()).toHaveTextContent('Sunday');
    await u.keyboard('{Home}');
    expect(active()).toHaveTextContent('Any day');
    await u.keyboard('w');
    expect(active()).toHaveTextContent('Wednesday');
  });

  it('closes on Escape without choosing, and on a click outside', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await u.click(trigger());
    await u.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    await u.click(trigger());
    await u.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores a click on a disabled option', async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await u.click(trigger());
    await u.click(screen.getByRole('option', { name: 'Tuesday' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows the placeholder when the value matches no option', () => {
    render(
      <Select
        aria-label="Group"
        value=""
        onChange={() => {}}
        options={[]}
        placeholder="Choose a group"
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveTextContent('Choose a group');
  });
});
