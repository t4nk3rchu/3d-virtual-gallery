import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotspotOverlay } from './HotspotOverlay';
import type { ArtworkHotspot } from '../../types/schema';

const mockHotspots: ArtworkHotspot[] = [
  {
    id: 'hs-1',
    artwork_id: 'art-1',
    title: 'Detail of Mountain Peak',
    description: 'Crisp snow line against winter sky',
    x_percent: 25,
    y_percent: 40,
    audio_timestamp_seconds: null,
    audio_timestamp_end_seconds: null,
    audio_file_id: null,
    anchor_3d_json: null,
  },
  {
    id: 'hs-2',
    artwork_id: 'art-1',
    title: 'Foreground Snow',
    description: 'Layered brushstrokes of white lacquer',
    x_percent: 60,
    y_percent: 80,
    audio_timestamp_seconds: null,
    audio_timestamp_end_seconds: null,
    audio_file_id: null,
    anchor_3d_json: null,
  },
];

describe('HotspotOverlay', () => {
  it('renders all hotspot pins with accessible labels and hover tooltips', () => {
    render(<HotspotOverlay hotspots={mockHotspots} />);

    const pin1 = screen.getByRole('button', { name: /Hotspot: Detail of Mountain Peak/i });
    const pin2 = screen.getByRole('button', { name: /Hotspot: Foreground Snow/i });

    expect(pin1).toBeTruthy();
    expect(pin2).toBeTruthy();
    expect(pin1.querySelector('.hotspot-pin__tooltip')?.textContent).toBe('Detail of Mountain Peak');
    expect(pin2.querySelector('.hotspot-pin__tooltip')?.textContent).toBe('Foreground Snow');
  });

  it('disappears (opacity: 0 and pointerEvents: none) when activeHotspotId is set, even with hideFloatingCard=true', () => {
    // In InspectLightbox, hideFloatingCard is true because the detail bar lives in the bottom inspect drawer.
    // When a user clicks and zooms into that hotspot area, the pin must disappear so the artwork is unobstructed.
    const { rerender } = render(
      <HotspotOverlay
        hotspots={mockHotspots}
        activeHotspotId={null}
        hideFloatingCard={true}
      />
    );

    const pin1 = screen.getByRole('button', { name: /Hotspot: Detail of Mountain Peak/i });
    expect(pin1.style.opacity).toBe('1');
    expect(pin1.style.pointerEvents).toBe('auto');

    rerender(
      <HotspotOverlay
        hotspots={mockHotspots}
        activeHotspotId="hs-1"
        hideFloatingCard={true}
      />
    );

    // This should FAIL with the current code because HotspotOverlay has:
    // opacity: isActive && !hideFloatingCard ? 0 : 1
    // which evaluated to 1 when hideFloatingCard was true!
    expect(pin1.style.opacity).toBe('0');
    expect(pin1.style.pointerEvents).toBe('none');
  });

  it('invokes onSelectHotspot callback when clicked', () => {
    const onSelect = vi.fn();
    render(
      <HotspotOverlay
        hotspots={mockHotspots}
        onSelectHotspot={onSelect}
      />
    );

    const pin1 = screen.getByRole('button', { name: /Hotspot: Detail of Mountain Peak/i });
    fireEvent.click(pin1);

    expect(onSelect).toHaveBeenCalledWith('hs-1');
  });
});
