import { describe, it, expect, vi } from 'vitest';
import { ResolutionScaler } from './resolution-scaler';

function mockEngine() {
  return { setHardwareScalingLevel: vi.fn() };
}

describe('ResolutionScaler', () => {
  it('starts at WALK tier on construction', () => {
    const engine = mockEngine();
    new ResolutionScaler(engine);
    // WALK = 1/0.75 ≈ 1.333...
    expect(engine.setHardwareScalingLevel).toHaveBeenCalledWith(1 / 0.75);
  });

  it('WALK tier calls setHardwareScalingLevel(1/0.75)', () => {
    const engine = mockEngine();
    const scaler = new ResolutionScaler(engine);
    engine.setHardwareScalingLevel.mockClear();
    scaler.setTier('FOCUS'); // change first
    scaler.setTier('WALK');
    expect(engine.setHardwareScalingLevel).toHaveBeenLastCalledWith(1 / 0.75);
  });

  it('FOCUS tier calls setHardwareScalingLevel(1/0.9)', () => {
    const engine = mockEngine();
    const scaler = new ResolutionScaler(engine);
    scaler.setTier('FOCUS');
    expect(engine.setHardwareScalingLevel).toHaveBeenLastCalledWith(1 / 0.9);
  });

  it('POPUP tier calls setHardwareScalingLevel(1.0)', () => {
    const engine = mockEngine();
    const scaler = new ResolutionScaler(engine);
    scaler.setTier('POPUP');
    expect(engine.setHardwareScalingLevel).toHaveBeenLastCalledWith(1.0);
  });

  it('does not call engine if tier is already set', () => {
    const engine = mockEngine();
    const scaler = new ResolutionScaler(engine);
    engine.setHardwareScalingLevel.mockClear(); // clear constructor call
    scaler.setTier('WALK'); // already WALK — no-op
    expect(engine.setHardwareScalingLevel).not.toHaveBeenCalled();
  });

  it('levelForTier returns correct values', () => {
    expect(ResolutionScaler.levelForTier('WALK')).toBeCloseTo(1 / 0.75);
    expect(ResolutionScaler.levelForTier('FOCUS')).toBeCloseTo(1 / 0.9);
    expect(ResolutionScaler.levelForTier('POPUP')).toBe(1.0);
  });
});
