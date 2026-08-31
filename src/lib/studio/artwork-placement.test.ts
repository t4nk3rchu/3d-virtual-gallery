import { describe, it, expect } from 'vitest';
import {
  parseArtworkTransform,
  isArtworkPlaced,
  setArtworkPlacement,
} from './artwork-placement';
import type { Artwork } from '../../types/schema';

describe('artwork-placement helpers', () => {
  const baseArtwork: Artwork = {
    id: 'art-1',
    exhibition_id: 'ex-1',
    title: 'Mona Lisa',
    artist: 'Leonardo',
    year: '1503',
    medium: 'Oil',
    dimensions: null,
    description: null,
    artwork_type: 'IMAGE_2D',
    media_file_id: 'file-123',
    youtube_video_id: null,
    audio_guide_file_id: null,
    transform_json: JSON.stringify({
      position: [1, 2, 3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    }),
    frame_config_json: '{}',
    order_index: 0,
    updated_at: Date.now(),
  };

  it('defaults legacy artworks without is_placed flag to placed (true)', () => {
    expect(isArtworkPlaced(baseArtwork)).toBe(true);
    const parsed = parseArtworkTransform(baseArtwork.transform_json);
    expect(parsed.is_placed).toBe(true);
  });

  it('correctly detects stored/unplaced artworks when is_placed is false', () => {
    const unplaced: Artwork = {
      ...baseArtwork,
      transform_json: JSON.stringify({
        position: [0, 1.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        is_placed: false,
      }),
    };
    expect(isArtworkPlaced(unplaced)).toBe(false);
  });

  it('updates placement flag while preserving spatial coordinates', () => {
    const updatedJson = setArtworkPlacement(baseArtwork.transform_json, false);
    const parsed = parseArtworkTransform(updatedJson);
    expect(parsed.is_placed).toBe(false);
    expect(parsed.position).toEqual([1, 2, 3]);

    const restoredJson = setArtworkPlacement(updatedJson, true);
    const restored = parseArtworkTransform(restoredJson);
    expect(restored.is_placed).toBe(true);
    expect(restored.position).toEqual([1, 2, 3]);
  });
});
