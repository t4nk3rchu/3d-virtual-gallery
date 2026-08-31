import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inspector } from './Inspector';
import type { Artwork } from '../../../types/schema';

const AW = {
  id: 'a1',
  title: 'Untitled',
  artist: 'X',
  artwork_type: 'IMAGE_2D',
  media_file_id: 'f1',
  order_index: 0,
} as unknown as Artwork;

afterEach(() => vi.unstubAllGlobals());

describe('Inspector', () => {
  it('collapses when nothing is selected', () => {
    const { container } = render(
      <Inspector
        exhibitionId="e1"
        selected={null}
        artworks={[]}
        artists={[]}
        onSaved={() => {}}
        onDeselect={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hosts the artwork form when a work is selected', () => {
    const { container } = render(
      <Inspector
        exhibitionId="e1"
        selected="a1"
        artworks={[AW]}
        artists={[]}
        onSaved={() => {}}
        onDeselect={() => {}}
      />,
    );
    expect(screen.getByText('Untitled')).toBeTruthy();
    expect(container.querySelector('.studio-drawer')).toBeNull();
  });
});
