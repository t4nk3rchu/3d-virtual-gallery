import { describe, it, expect } from 'vitest';
import { calculateFrameDimensions } from './frame-builder';

describe('calculateFrameDimensions', () => {
  it('adds frame and mat on all four sides', () => {
    const dims = calculateFrameDimensions(1.0, 0.75, {
      frameWidth: 0.05,
      matWidth: 0.03,
    });

    // total border = 0.05 + 0.03 = 0.08 per side → 0.16 total
    expect(dims.outerWidth).toBeCloseTo(1.0 + 0.08 * 2);
    expect(dims.outerHeight).toBeCloseTo(0.75 + 0.08 * 2);
    expect(dims.innerWidth).toBe(1.0);
    expect(dims.innerHeight).toBe(0.75);
  });

  it('zero frame + mat gives outerWidth === artworkWidth', () => {
    const dims = calculateFrameDimensions(2.0, 1.5, { frameWidth: 0, matWidth: 0 });
    expect(dims.outerWidth).toBe(2.0);
    expect(dims.outerHeight).toBe(1.5);
  });

  it('works for non-square artwork', () => {
    const dims = calculateFrameDimensions(0.5, 1.2, { frameWidth: 0.04, matWidth: 0.02 });
    expect(dims.outerWidth).toBeCloseTo(0.5 + 0.12);
    expect(dims.outerHeight).toBeCloseTo(1.2 + 0.12);
  });
});
