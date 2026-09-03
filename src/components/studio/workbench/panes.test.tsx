import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolRail } from './ToolRail';
import { ArtworksPane } from './ArtworksPane';
import type { Artwork } from '../../../types/schema';

const AW = [
  {
    id: 'a1',
    title: 'Untitled',
    artist: 'X',
    medium: 'Oil',
    artwork_type: 'IMAGE_2D',
    media_file_id: 'f1',
    order_index: 0,
  },
] as unknown as Artwork[];

describe('ToolRail', () => {
  it('marks the active tool and switches', async () => {
    const onChange = vi.fn();
    render(<ToolRail active="curate" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Curate/i }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: /Artists/i }));
    expect(onChange).toHaveBeenCalledWith('artists');
  });
});

describe('ArtworksPane', () => {
  it('lists works and selects one', async () => {
    const onSelect = vi.fn();
    render(
      <ArtworksPane
        artworks={AW}
        selectedId={null}
        onSelect={onSelect}
        onAdd={() => {}}
      />,
    );
    await userEvent.click(screen.getByText('Untitled'));
    expect(onSelect).toHaveBeenCalledWith('a1');
  });

  it('filters artworks between In Room and Storage tabs', async () => {
    const storedWork = {
      id: 'a2',
      title: 'Stored Work',
      artist: 'Y',
      transform_json: JSON.stringify({ is_placed: false }),
    } as unknown as Artwork;

    render(
      <ArtworksPane
        artworks={[...AW, storedWork]}
        selectedId={null}
        onSelect={() => {}}
        onAdd={() => {}}
      />,
    );

    expect(screen.getByText(/In Room \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Storage \(1\)/i)).toBeTruthy();
    expect(screen.getByText('Untitled')).toBeTruthy();

    await userEvent.click(screen.getByRole('tab', { name: /Storage/i }));
    expect(screen.getByText('Stored Work')).toBeTruthy();
  });
});
