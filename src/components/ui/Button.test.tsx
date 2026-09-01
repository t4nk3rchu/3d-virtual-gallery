import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders label and default primary class', () => {
    render(<Button>Publish</Button>);
    const btn = screen.getByRole('button', { name: 'Publish' });
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn--primary');
  });
  it('applies variant and size', () => {
    render(<Button variant="danger" size="sm">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('btn--danger');
    expect(btn.className).toContain('btn--sm');
  });
  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('renders a leading icon marked aria-hidden', () => {
    const { container } = render(<Button iconLeft="plus">Add</Button>);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });
});
