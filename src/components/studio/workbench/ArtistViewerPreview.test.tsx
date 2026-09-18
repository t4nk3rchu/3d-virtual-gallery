import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistViewerPreview } from './ArtistViewerPreview';
import type { Artist, Artwork } from '../../../types/schema';

const mockArtist: Artist = {
  id: 'artist-1',
  exhibition_id: 'ex-1',
  name: 'Bùi Xuân Phái',
  life_dates: '1920 – 1988',
  biography: 'Famous Vietnamese modern painter renowned for Old Hanoi paintings.',
  quote: 'Painting is capturing the fleeting beauty of a bygone era.',
  contact_info: 'Hanoi · Vietnam',
  portrait_file_id: 'portrait-1',
  order_index: 0,
  created_at: 1000,
};

const mockArtworks: Artwork[] = [
  {
    id: 'art-1',
    exhibition_id: 'ex-1',
    artist_id: 'artist-1',
    title: 'Phố cổ sau mưa',
    artist: 'Bùi Xuân Phái',
    year: '1972',
    medium: 'Oil on canvas',
    dimensions: null,
    description: null,
    artwork_type: 'IMAGE_2D',
    media_file_id: 'img-1',
    model_proxy_file_id: null,
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{}',
    frame_config_json: '{}',
    order_index: 0,
    updated_at: 1000,
  },
  {
    id: 'art-2',
    exhibition_id: 'ex-1',
    artist_id: 'artist-1',
    title: 'Ngõ nhỏ Hà Nội',
    artist: 'Bùi Xuân Phái',
    year: '1975',
    medium: 'Oil on canvas',
    dimensions: null,
    description: null,
    artwork_type: 'IMAGE_2D',
    media_file_id: 'img-2',
    model_proxy_file_id: null,
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{}',
    frame_config_json: '{}',
    order_index: 1,
    updated_at: 1001,
  },
];

describe('ArtistViewerPreview', () => {
  it('renders close button matching viewer screen modal close pattern', () => {
    render(<ArtistViewerPreview artist={mockArtist} />);

    const closeBtn = screen.getByRole('button', { name: /Close artist profile/i });
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.className).toContain('artist-modal-close');
  });

  it('renders assigned works section at the bottom of the preview card when artworks are provided', () => {
    render(
      <ArtistViewerPreview
        artist={mockArtist}
        artworks={mockArtworks}
      />
    );

    expect(screen.getByText(/Works in Exhibition/i)).toBeTruthy();
    expect(screen.getByText('Phố cổ sau mưa')).toBeTruthy();
    expect(screen.getByText('Ngõ nhỏ Hà Nội')).toBeTruthy();
  });
});
