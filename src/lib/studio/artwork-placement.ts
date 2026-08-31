import type { Artwork } from '../../types/schema';

export interface ArtworkTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  is_placed?: boolean;
}

export function parseArtworkTransform(json: string | null | undefined): ArtworkTransform {
  if (!json) {
    return { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], is_placed: true };
  }
  try {
    const parsed = JSON.parse(json);
    return {
      position: Array.isArray(parsed.position) ? parsed.position : [0, 1.5, 0],
      rotation: Array.isArray(parsed.rotation) ? parsed.rotation : [0, 0, 0],
      scale: Array.isArray(parsed.scale) ? parsed.scale : [1, 1, 1],
      is_placed: parsed.is_placed !== false,
    };
  } catch {
    return { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], is_placed: true };
  }
}

export function isArtworkPlaced(artwork: Artwork | null | undefined): boolean {
  if (!artwork) return false;
  return parseArtworkTransform(artwork.transform_json).is_placed !== false;
}

export function setArtworkPlacement(transformJson: string | null | undefined, isPlaced: boolean): string {
  const current = parseArtworkTransform(transformJson);
  current.is_placed = isPlaced;
  return JSON.stringify(current);
}
