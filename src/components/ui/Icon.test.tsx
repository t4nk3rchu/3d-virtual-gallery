import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an svg with the reda-icon class', () => {
    const { container } = render(<Icon name="plus" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('reda-icon')).toBe(true);
  });
  it('is aria-hidden when no title', () => {
    const { container } = render(<Icon name="gear" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('exposes a title as role=img when provided', () => {
    const { getByRole } = render(<Icon name="trash" title="Delete" />);
    const svg = getByRole('img', { name: 'Delete' });
    expect(svg).toBeTruthy();
  });

  it('renders Lucide icons with .reda-icon for all registered IconNames', () => {
    const iconNames = [
      'select', 'frame', 'pin', 'cube', 'user', 'users', 'gear', 'close',
      'sound', 'soundMute', 'map', 'fullscreen', 'play', 'inspect', 'plus',
      'chevronRight', 'chevronLeft', 'chevronUp', 'chevronDown', 'external',
      'trash', 'film', 'palette', 'audio', 'walk', 'mouse', 'target', 'info',
      'search', 'reset', 'refresh', 'minimize', 'maximize', 'list', 'pause',
      'phone', 'lock', 'shield', 'arrowRight', 'google',
    ] as const;

    for (const name of iconNames) {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.classList.contains('reda-icon')).toBe(true);
      expect(svg?.children.length).toBeGreaterThan(0);
    }
  });
});

