import { describe, it, expect } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { pinScaleForRadius, isPointFacingCamera } from './model-hotspot-math';

describe('pinScaleForRadius', () => {
  it('is largest when fully zoomed out and smallest when zoomed in', () => {
    expect(pinScaleForRadius(10, 2, 10, 14, 40)).toBe(40); // max radius -> max px
    expect(pinScaleForRadius(2, 2, 10, 14, 40)).toBe(14);  // min radius -> min px
  });
  it('clamps out-of-range radii', () => {
    expect(pinScaleForRadius(100, 2, 10, 14, 40)).toBe(40);
    expect(pinScaleForRadius(0, 2, 10, 14, 40)).toBe(14);
  });
});

describe('isPointFacingCamera', () => {
  const cam = new Vector3(0, 0, 5);
  it('true when the surface normal points toward the camera', () => {
    expect(isPointFacingCamera(new Vector3(0, 0, 1), new Vector3(0, 0, 1), cam)).toBe(true);
  });
  it('false when the normal points away (occluded on the far side)', () => {
    expect(isPointFacingCamera(new Vector3(0, 0, -1), new Vector3(0, 0, -1), cam)).toBe(false);
  });
});
