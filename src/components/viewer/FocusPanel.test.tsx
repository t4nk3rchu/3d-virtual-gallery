import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FocusPanel } from './FocusPanel';
import type { Artwork } from '../../types/schema';

const artwork = {
  id: 'a1', title: 'Study in Ochre', artist: 'E. Marchetti', year: 1971,
  medium: 'Oil on linen', dimensions: '92 x 68 cm', description: 'A warm field.',
  artwork_type: 'IMAGE_2D', media_file_id: 'm1', updated_at: 1,
} as unknown as Artwork;

describe('FocusPanel', () => {
  it('renders icons and no emoji', () => {
    const { container } = render(
      <FocusPanel artwork={artwork} onInspect={() => {}} onClose={() => {}} />
    );
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThan(0);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2100}-\u{214F}\u{FE0F}]/u);
  });

  it('calls onClose when Escape key is pressed', () => {
    let closed = false;
    render(
      <FocusPanel artwork={artwork} onInspect={() => {}} onClose={() => { closed = true; }} />
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(true);
  });

  it('calls onPreviousArtwork and onNextArtwork on ArrowLeft and ArrowRight keys', () => {
    let prevCalled = false;
    let nextCalled = false;
    render(
      <FocusPanel
        artwork={artwork}
        onInspect={() => {}}
        onPreviousArtwork={() => { prevCalled = true; }}
        onNextArtwork={() => { nextCalled = true; }}
        onClose={() => {}}
      />
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(prevCalled).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(nextCalled).toBe(true);
  });

  it('mounts audio element and auto-plays when audio_guide_file_id is present', () => {
    const playSpy = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playSpy;
    const artWithAudio = { ...artwork, audio_guide_file_id: 'guide-1' } as Artwork;
    const { container } = render(
      <FocusPanel artwork={artWithAudio} onInspect={() => {}} onClose={() => {}} />
    );
    const audioEl = container.querySelector('audio');
    expect(audioEl).toBeTruthy();
    expect(playSpy).toHaveBeenCalled();
  });
});
