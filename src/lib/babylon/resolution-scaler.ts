/**
 * Task 6: 3-tier resolution scaler
 *
 * Gap fix from v1: scaler was implemented correctly but never called.
 * This module is independently tested; Task 8 wires it to state transitions.
 *
 * Tiers (spec §5.1):
 *   WALK   → setHardwareScalingLevel(1/0.75) = 75% resolution
 *   FOCUS  → setHardwareScalingLevel(1/0.9)  = 90% resolution
 *   POPUP  → setHardwareScalingLevel(1.0)    = 100% resolution
 */

export type ResolutionTier = 'WALK' | 'FOCUS' | 'POPUP';

export interface BabylonEngine {
  setHardwareScalingLevel(level: number): void;
}

const TIER_LEVELS: Record<ResolutionTier, number> = {
  WALK: 1 / 0.75,
  FOCUS: 1 / 0.9,
  POPUP: 1.0,
};

export class ResolutionScaler {
  private _currentTier: ResolutionTier = 'WALK';
  private readonly engine: BabylonEngine;

  constructor(engine: BabylonEngine) {
    this.engine = engine;
    // Start at the WALK tier (spec §5.1: Roam default = 75%)
    this.engine.setHardwareScalingLevel(TIER_LEVELS.WALK);
  }

  get currentTier(): ResolutionTier {
    return this._currentTier;
  }

  setTier(tier: ResolutionTier): void {
    if (this._currentTier === tier) return;
    this._currentTier = tier;
    this.engine.setHardwareScalingLevel(TIER_LEVELS[tier]);
  }

  /** Convenience: return the hardware scaling level for a given tier */
  static levelForTier(tier: ResolutionTier): number {
    return TIER_LEVELS[tier];
  }
}
