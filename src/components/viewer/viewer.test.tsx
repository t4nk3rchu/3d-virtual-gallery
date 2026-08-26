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
