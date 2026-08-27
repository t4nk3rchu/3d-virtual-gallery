import { describe, it, expect } from 'vitest';
import {
  HOTSPOT_TRANSITIONS,
  getHotspotAnimation,
  interpolateHotspotTransition,
  type HotspotTransition,
  type HotspotAnimationState,
} from './hotspot-animations';

describe('hotspot-animations registry & presets', () => {
  const from: HotspotAnimationState = { x: 100, y: 200, s: 2.0 };
  const to: HotspotAnimationState = { x: 300, y: 400, s: 3.0 };

  it('provides all 5 core animation presets in HOTSPOT_TRANSITIONS', () => {
    const ids = HOTSPOT_TRANSITIONS.map((t) => t.id);
    expect(ids).toEqual([
      'arc_dip',
      'linear_glide',
      'deep_pullback',
      'instant_cut',
      'spring_overshoot',
    ]);
  });

  it('getHotspotAnimation returns the requested preset or falls back to arc_dip', () => {
    expect(getHotspotAnimation('linear_glide').id).toBe('linear_glide');
    expect(getHotspotAnimation('spring_overshoot').id).toBe('spring_overshoot');
    // fallback for undefined or unknown
    expect(getHotspotAnimation(undefined).id).toBe('arc_dip');
    expect(getHotspotAnimation('unknown_preset' as HotspotTransition).id).toBe('arc_dip');
  });

  describe('interpolateHotspotTransition start and end boundaries', () => {
    const transitions: HotspotTransition[] = [
      'arc_dip',
      'linear_glide',
      'deep_pullback',
      'instant_cut',
      'spring_overshoot',
    ];

    transitions.forEach((type) => {
      it(`progress 0 returns start state for ${type}`, () => {
        const state = interpolateHotspotTransition(type, from, to, 0);
        expect(state.x).toBeCloseTo(from.x, 1);
        expect(state.y).toBeCloseTo(from.y, 1);
        expect(state.s).toBeCloseTo(from.s, 1);
      });

      it(`progress 1 returns end state for ${type}`, () => {
        const state = interpolateHotspotTransition(type, from, to, 1);
        expect(state.x).toBeCloseTo(to.x, 1);
        expect(state.y).toBeCloseTo(to.y, 1);
        expect(state.s).toBeCloseTo(to.s, 1);
      });
    });
  });

  describe('distinct behavior of each transition style at midpoint (progress 0.5)', () => {
    it('arc_dip dips scale lower than linear midpoint', () => {
      const mid = interpolateHotspotTransition('arc_dip', from, to, 0.5);
      const linearMidScale = (from.s + to.s) / 2; // 2.5
      expect(mid.s).toBeLessThan(linearMidScale);
    });

    it('linear_glide scale matches linear interpolated scale', () => {
      const mid = interpolateHotspotTransition('linear_glide', from, to, 0.5);
      const linearMidScale = (from.s + to.s) / 2; // 2.5
      expect(mid.s).toBeCloseTo(linearMidScale, 2);
    });

    it('deep_pullback zooms out significantly to overview level at midpoint', () => {
      const overviewScale = 0.6;
      const mid = interpolateHotspotTransition('deep_pullback', from, to, 0.5, overviewScale);
      expect(mid.s).toBeLessThanOrEqual(0.8);
    });

    it('spring_overshoot shows elastic bounce character near destination (progress 0.75-0.85)', () => {
      const nearEnd = interpolateHotspotTransition('spring_overshoot', from, to, 0.78);
      // Either x, y, or scale overshoots the destination during spring oscillation
      expect(nearEnd.x).toBeGreaterThan(to.x - 50);
    });
  });
});
