import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';
import { SegmentedControl } from './SegmentedControl';
import { Tabs } from './Tabs';

describe('Toggle', () => {
  it('exposes switch role and toggles', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Wall label" />);
    const sw = screen.getByRole('switch', { name: 'Wall label' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
describe('SegmentedControl', () => {
  it('marks the active option pressed and switches', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl ariaLabel="Mode" value="place"
      options={[{ value: 'roam', label: 'Roam' }, { value: 'place', label: 'Place' }]}
      onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Place' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Roam' }));
    expect(onChange).toHaveBeenCalledWith('roam');
  });
});
describe('Tabs', () => {
  it('renders a tablist and selects', async () => {
    const onChange = vi.fn();
    render(<Tabs active="details" onChange={onChange}
      tabs={[{ id: 'details', label: 'Details' }, { id: 'transform', label: 'Transform' }]} />);
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'Transform' }));
    expect(onChange).toHaveBeenCalledWith('transform');
  });
});
