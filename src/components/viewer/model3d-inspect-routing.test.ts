import { describe, it, expect } from 'vitest';
import { is3DModel } from './model3d-inspect-routing';

describe('is3DModel', () => {
  it('true only for MODEL_3D artworks', () => {
    expect(is3DModel({ artwork_type: 'MODEL_3D' } as any)).toBe(true);
    expect(is3DModel({ artwork_type: 'IMAGE_2D' } as any)).toBe(false);
    expect(is3DModel(null)).toBe(false);
  });
});
