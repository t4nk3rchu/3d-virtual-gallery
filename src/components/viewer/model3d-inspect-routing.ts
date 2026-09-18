import type { Artwork } from '../../types/schema';

export function is3DModel(artwork: Pick<Artwork, 'artwork_type'> | null): boolean {
  return artwork?.artwork_type === 'MODEL_3D';
}
