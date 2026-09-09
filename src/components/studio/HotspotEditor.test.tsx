import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('requires two-step confirmation before deleting a hotspot', async () => {
    const onHotspotsUpdated = vi.fn();
    // mock global fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    render(
      <HotspotEditor
        artwork={mockArtwork}
        hotspots={mockHotspots}
        onHotspotsUpdated={onHotspotsUpdated}
        onClose={vi.fn()}
      />
    );

    const pin = screen.getByTitle('Testing hotspot point');
    fireEvent.click(pin);

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    // After first click, should not have called DELETE fetch yet, but show confirm prompt
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/hotspots/hs-1'), expect.anything());
    const confirmDeleteBtn = screen.getByRole('button', { name: /Confirm Delete|Are you sure/i });
    expect(confirmDeleteBtn).toBeTruthy();

    // Clicking confirm delete executes the deletion
    fireEvent.click(confirmDeleteBtn);
    expect(global.fetch).toHaveBeenCalledWith('/api/hotspots/hs-1', expect.objectContaining({ method: 'DELETE' }));

    global.fetch = originalFetch;
  });

  it('offers Undo after a deletion and re-creates the hotspot via POST', async () => {
    const onHotspotsUpdated = vi.fn();
    const originalFetch = global.fetch;
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ...mockHotspots[0], id: 'hs-restored' }) });

    render(
      <HotspotEditor
        artwork={mockArtwork}
        hotspots={mockHotspots}
        onHotspotsUpdated={onHotspotsUpdated}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Testing hotspot point'));
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i })); // arm confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete|Are you sure/i })); // delete

    // The Undo affordance appears once the deletion resolves
    const undoBtn = await screen.findByRole('button', { name: /Undo/i });
    fireEvent.click(undoBtn);

    // Undo re-creates the hotspot with its original position + text
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hotspots',
        expect.objectContaining({ method: 'POST' })
      )
    );

    global.fetch = originalFetch;
  });

  it('persists pin position (x/y) when saving a hotspot edit', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...mockHotspots[0] }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <HotspotEditor
        artwork={mockArtwork}
        hotspots={mockHotspots}
        onHotspotsUpdated={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Testing hotspot point')); // select
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/hotspots/hs-1',
        expect.objectContaining({ method: 'PUT' })
      )
    );
    const putCall = fetchMock.mock.calls.find(
      (c: unknown[]) => c[0] === '/api/hotspots/hs-1' && (c[1] as { method?: string })?.method === 'PUT'
    );
    const body = JSON.parse((putCall![1] as { body: string }).body);
    expect(body.x_percent).toBe(42);
    expect(body.y_percent).toBe(48.5);

    global.fetch = originalFetch;
  });
});
