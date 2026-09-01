import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistInspector } from './ArtistInspector';
import type { Artist } from '../../../types/schema';

const MOCK_ARTIST: Artist = {
  id: 'art-1',
  exhibition_id: 'exh-1',
  name: 'Trần Văn Cẩn',
  biography: 'A prominent Vietnamese painter.',
  life_dates: '1910–1994',
  quote: 'Art is the essence of life.',
  contact_info: 'Hanoi',
  portrait_file_id: 'drive-file-123',
  order_index: 0,
  created_at: 1000,
};

afterEach(() => vi.unstubAllGlobals());

describe('ArtistInspector', () => {
  it('collapses when no artist is selected', () => {
    const { container } = render(
      <ArtistInspector
        exhibitionId="exh-1"
        selectedId={null}
        artists={[MOCK_ARTIST]}
        artworks={[]}
        onSaved={vi.fn()}
        onDeselect={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders artist form inline in inspector when an artist is selected', () => {
    const { container } = render(
      <ArtistInspector
        exhibitionId="exh-1"
        selectedId="art-1"
        artists={[MOCK_ARTIST]}
        artworks={[]}
        onSaved={vi.fn()}
        onDeselect={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('Trần Văn Cẩn')).toBeDefined();
    expect(screen.getByDisplayValue('1910–1994')).toBeDefined();
    expect(screen.getByText('Save Profile')).toBeDefined();
    expect(container.querySelector('.studio-drawer')).toBeNull();
  });

  it('renders new artist form inline in inspector when selectedId is "new"', () => {
    const { container } = render(
      <ArtistInspector
        exhibitionId="exh-1"
        selectedId="new"
        artists={[MOCK_ARTIST]}
        artworks={[]}
        onSaved={vi.fn()}
        onDeselect={vi.fn()}
      />
    );
    expect(screen.getByText('New artist')).toBeDefined();
    expect(screen.getByText('Add Artist')).toBeDefined();
    expect(container.querySelector('.studio-drawer')).toBeNull();
  });
});
