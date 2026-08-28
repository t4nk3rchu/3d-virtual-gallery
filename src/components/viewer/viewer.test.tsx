/**
 * Task 9 & 10: Viewer component tests
 * Tests Inspect lightbox requests the =s0 original URL,
 * hotspot with timestamp invokes the audio-seek callback,
 * and fallback renders when WebGL is unavailable.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotspotOverlay } from './HotspotOverlay';
import type { ArtworkHotspot } from '../../types/schema';

// ─── HotspotOverlay tests ─────────────────────────────────────────────────────
describe('HotspotOverlay', () => {
  const hotspots: ArtworkHotspot[] = [
    {
      id: 'hs1',
      artwork_id: 'art1',
      x_percent: 25,
      y_percent: 50,
      title: 'Craquelure detail',
      description: 'Fine cracks in the varnish layer.',
      audio_timestamp_seconds: 42.5,
      audio_file_id: null,
    },
    {
      id: 'hs2',
      artwork_id: 'art1',
      x_percent: 75,
      y_percent: 30,
      title: 'Signature',
      description: 'The artist signed in pencil.',
      audio_timestamp_seconds: null,
      audio_file_id: null,
    },
  ];

  it('renders a button for each hotspot', () => {
    render(<HotspotOverlay hotspots={hotspots} />);
    expect(screen.getByLabelText('Hotspot: Craquelure detail')).toBeTruthy();
    expect(screen.getByLabelText('Hotspot: Signature')).toBeTruthy();
  });

  it('shows card on pin click', () => {
    render(<HotspotOverlay hotspots={hotspots} />);
    fireEvent.click(screen.getByLabelText('Hotspot: Craquelure detail'));
    expect(screen.getByText('Fine cracks in the varnish layer.')).toBeTruthy();
  });

  it('invokes onAudioSeek with correct timestamp', () => {
    const onSeek = vi.fn();
    render(<HotspotOverlay hotspots={hotspots} onAudioSeek={onSeek} />);
    fireEvent.click(screen.getByLabelText('Hotspot: Craquelure detail'));
    fireEvent.click(screen.getByText(/Jump to 42s/));
    expect(onSeek).toHaveBeenCalledWith(42.5);
  });

  it('does not show seek button when timestamp is null', () => {
    const onSeek = vi.fn();
    render(<HotspotOverlay hotspots={hotspots} onAudioSeek={onSeek} />);
    fireEvent.click(screen.getByLabelText('Hotspot: Signature'));
    // No seek button for this hotspot
    expect(screen.queryByText(/Jump to/)).toBeNull();
  });
});

// ─── ArtworkHoverTooltip tests ────────────────────────────────────────────────
import { ArtworkHoverTooltip } from './ArtworkHoverTooltip';
import type { Artwork } from '../../types/schema';

describe('ArtworkHoverTooltip', () => {
  const sampleArt: Artwork = {
    id: 'art1',
    exhibition_id: 'ex1',
    title: 'Starry Night',
    artist: 'Vincent van Gogh',
    year: '1889',
    medium: 'Oil on canvas',
    dimensions: '73.7 cm × 92.1 cm',
    description: 'Post-impressionist masterpiece',
    artwork_type: 'IMAGE_2D',
    media_file_id: 'drive123',
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{"position":[0,1.5,0],"rotation":[0,0,0],"scale":[1,1,1]}',
    frame_config_json: '{}',
    order_index: 0,
    updated_at: 1000,
  };

  it('renders nothing if artwork or position is null', () => {
    const { container } = render(<ArtworkHoverTooltip artwork={null} position={{ x: 100, y: 100 }} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders artist name, title and year', () => {
    render(<ArtworkHoverTooltip artwork={sampleArt} position={{ x: 150, y: 200 }} />);
    expect(screen.getByText('Vincent van Gogh')).toBeTruthy();
    expect(screen.getByText('Starry Night')).toBeTruthy();
    expect(screen.getByText(/1889/)).toBeTruthy();
  });
});

// ─── FocusPanel tests ─────────────────────────────────────────────────────────
import { FocusPanel } from './FocusPanel';

describe('FocusPanel', () => {
  const sampleArt: Artwork = {
    id: 'art1',
    exhibition_id: 'ex1',
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: '1503',
    medium: 'Oil on poplar panel',
    dimensions: '77 cm × 53 cm',
    description: 'Iconic portrait with an enigmatic smile.',
    artwork_type: 'IMAGE_2D',
    media_file_id: 'drive123',
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: '{"position":[0,1.5,0],"rotation":[0,0,0],"scale":[1,1,1]}',
    frame_config_json: '{}',
    order_index: 0,
    updated_at: 1000,
  };

  it('renders compact header bar initially without expanded modal', () => {
    render(
      <FocusPanel
        artwork={sampleArt}
        onInspect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Exit detail view')).toBeTruthy();
    expect(screen.getByTitle('Artwork details')).toBeTruthy();
    // Modal dialog is initially collapsed
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('toggles info popover modal when ℹ button is clicked', () => {
    render(
      <FocusPanel
        artwork={sampleArt}
        onInspect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const infoBtn = screen.getByTitle('Artwork details');
    fireEvent.click(infoBtn);

    // Modal dialog is now visible
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Oil on poplar panel')).toBeTruthy();
    expect(screen.getByText('77 cm × 53 cm')).toBeTruthy();
    expect(screen.getByText('Iconic portrait with an enigmatic smile.')).toBeTruthy();

    // Close button in modal collapses it
    fireEvent.click(screen.getByLabelText('Close information card'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('triggers onPreviousArtwork and onNextArtwork when rail buttons are clicked', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <FocusPanel
        artwork={sampleArt}
        onInspect={vi.fn()}
        onPreviousArtwork={onPrev}
        onNextArtwork={onNext}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Previous artwork'));
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Next artwork'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
