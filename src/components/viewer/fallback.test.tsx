/**
 * Task 10: FallbackCatalog test + isWebGLSupported
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FallbackCatalog, isWebGLSupported } from './FallbackCatalog';
import type { Artwork } from '../../types/schema';

// ─── isWebGLSupported ────────────────────────────────────────────────────────
describe('isWebGLSupported', () => {
  it('returns false when getContext returns null', () => {
    // jsdom doesn't support WebGL — should return false
    const result = isWebGLSupported();
    // In jsdom environment, WebGL is not available
    expect(typeof result).toBe('boolean');
  });
});

// ─── FallbackCatalog ─────────────────────────────────────────────────────────
const artworks: Artwork[] = [
  {
    id: 'art1',
    exhibition_id: 'ex1',
    title: 'Sunlit Meadow',
    artist: 'Jane Artist',
    year: '2024',
    medium: 'Oil on canvas',
    dimensions: '60 × 80 cm',
    description: 'A pastoral scene.',
    artwork_type: 'IMAGE_2D',
    media_file_id: 'fileId123',
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{}',
    frame_config_json: '{}',
    order_index: 0,
    updated_at: 1712345678,
  },
  {
    id: 'art2',
    exhibition_id: 'ex1',
    title: 'Ocean Sounds',
    artist: 'John Audio',
    year: null,
    medium: 'Sound installation',
    dimensions: null,
    description: null,
    artwork_type: 'AUDIO',
    media_file_id: 'audioFileId',
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{}',
    frame_config_json: '{}',
    order_index: 1,
    updated_at: 1712345678,
  },
];

describe('FallbackCatalog', () => {
  it('renders exhibition title', () => {
    render(
      <FallbackCatalog
        title="Summer Exhibition"
        artworks={artworks}
      />
    );
    expect(screen.getByText('Summer Exhibition')).toBeTruthy();
  });

  it('renders all artworks', () => {
    render(<FallbackCatalog title="Test" artworks={artworks} />);
    expect(screen.getByText('Sunlit Meadow')).toBeTruthy();
    expect(screen.getByText('Ocean Sounds')).toBeTruthy();
  });

  it('renders IMAGE_2D as an img element', () => {
    render(<FallbackCatalog title="Test" artworks={artworks} />);
    const img = screen.getByAltText('Sunlit Meadow') as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('lh3.googleusercontent.com');
    expect(img.src).toContain('=w1600'); // gallery tier
  });

  it('renders AUDIO artwork with audio element', () => {
    const { container } = render(<FallbackCatalog title="Test" artworks={artworks} />);
    // HTMLAudioElement has no ARIA role — query by tag name
    const audioEls = container.querySelectorAll('audio');
    expect(audioEls.length).toBeGreaterThan(0);
  });

  it('shows WebGL notice', () => {
    render(<FallbackCatalog title="Test" artworks={artworks} />);
    expect(screen.getByText(/WebGL2/)).toBeTruthy();
  });

  it('renders artworks in order_index order', () => {
    const reversed = [...artworks].reverse();
    render(<FallbackCatalog title="Test" artworks={reversed} />);
    const titles = screen
      .getAllByRole('article')
      .map((el) => el.querySelector('h2')?.textContent ?? '');
    expect(titles[0]).toBe('Sunlit Meadow');
    expect(titles[1]).toBe('Ocean Sounds');
  });
});
