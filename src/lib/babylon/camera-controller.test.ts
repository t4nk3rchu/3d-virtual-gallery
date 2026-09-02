import { describe, it, expect } from 'vitest';
import { calculateFocusPosition } from './camera-controller';

describe('calculateFocusPosition', () => {
  it('places camera viewDistance in front of artwork along its normal', () => {
    const result = calculateFocusPosition(
      { x: 0, y: 1.5, z: -3 },   // artwork at z=-3 on back wall
      { x: 0, y: 0, z: 1 },       // normal pointing forward (+z)
      1.5
    );
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(1.5); // same height as artwork
    expect(result.z).toBeCloseTo(-3 + 1 * 1.5); // = -1.5
  });

  it('works for artworks on the side wall (x-normal)', () => {
    const result = calculateFocusPosition(
      { x: -5, y: 1.5, z: 0 },
      { x: 1, y: 0, z: 0 },        // normal pointing right
      2.0
    );
    expect(result.x).toBeCloseTo(-5 + 2);
    expect(result.y).toBeCloseTo(1.5);
    expect(result.z).toBeCloseTo(0);
  });

  it('respects viewDistance scaling', () => {
    const pos = calculateFocusPosition(
      { x: 0, y: 1.0, z: 0 },
      { x: 0, y: 0, z: 1 },
      3.0
    );
    expect(pos.z).toBeCloseTo(3.0);
  });
});

describe('CAMERA_CONFIG control mode', () => {
  it('defaults to gallery mode and allows setting fps mode', async () => {
    const { CAMERA_CONFIG } = await import('./camera-controller');
    expect(CAMERA_CONFIG.controlMode).toBe('gallery');
  });
});
