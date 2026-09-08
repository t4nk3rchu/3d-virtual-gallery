import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotspotEditor } from './HotspotEditor';
import type { Artwork, ArtworkHotspot } from '../../types/schema';

const mockArtwork: Artwork = {
  id: 'art-1',
  exhibition_id: 'ex-1',
  title: 'Testing artwork',
  artist: 'Artist',
  artist_id: null,
  medium: 'Oil on canvas',
  year: '1972',
  dimensions: null,
  description: null,
  artwork_type: 'IMAGE_2D',
  media_file_id: 'img-1',
  youtube_video_id: null,
  audio_guide_file_id: null,
  transform_json: '{}',
  frame_config_json: '{}',
  order_index: 0,
  updated_at: 1000,
};

const mockHotspots: ArtworkHotspot[] = [
  {
    id: 'hs-1',
    artwork_id: 'art-1',
    title: 'Testing hotspot point',
    description: 'Interpretive description',
    x_percent: 42,
    y_percent: 48.5,
    audio_timestamp_seconds: null,
    audio_timestamp_end_seconds: null,
    audio_file_id: null,
  },
];

describe('HotspotEditor', () => {
  it('renders modal header and close button with circular styling pattern', () => {
    render(
      <HotspotEditor
        artwork={mockArtwork}
        hotspots={mockHotspots}
        onHotspotsUpdated={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.className).toContain('hotspot-editor-close');
  });

  it('orders action buttons as Cancel -> Delete -> Save Changes when editing a hotspot', () => {
    render(
      <HotspotEditor
        artwork={mockArtwork}
        hotspots={mockHotspots}
        onHotspotsUpdated={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Click on the existing hotspot pin to open edit mode
    const pin = screen.getByTitle('Testing hotspot point');
    fireEvent.click(pin);

    expect(screen.getByText('Edit Hotspot')).toBeTruthy();

    const formActions = document.querySelector('.hotspot-pin-form .form-actions');
    expect(formActions).toBeTruthy();

    const buttons = formActions!.querySelectorAll('button');
    // Button order in mockup .mact: Huỷ (Cancel) -> Xoá (Delete) -> Lưu (Save Changes)
    expect(buttons[0].textContent).toMatch(/Cancel/i);
    expect(buttons[1].textContent).toMatch(/Delete/i);
    expect(buttons[2].textContent).toMatch(/Save Changes/i);
  });
});
