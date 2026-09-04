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
 *
 * setHardwareScalingLevel sets an absolute, CSS-relative backing size (it
 * overrides the engine's adaptToDeviceRatio), so these tiers already cap
 * resolution independently of devicePixelRatio. The WALK resolution is
 * configurable so low-powered mobile GPUs can render the roam view even softer.
 */

export type ResolutionTier = 'WALK' | 'FOCUS' | 'POPUP';

export interface BabylonEngine {
  setHardwareScalingLevel(level: number): void;
}

export class ResolutionScaler {
  private _currentTier: ResolutionTier = 'WALK';
  private readonly engine: BabylonEngine;
  private readonly levels: Record<ResolutionTier, number>;

  /**
   * @param walkResolution roam-tier render fraction of CSS size (default 0.75).
   *   Pass a lower value (e.g. 0.6) on mobile for more headroom.
   */
  constructor(engine: BabylonEngine, walkResolution = 0.75) {
    this.engine = engine;
    this.levels = {
      WALK: 1 / walkResolution,
      FOCUS: 1 / 0.9,
      POPUP: 1.0,
    };
    // Start at the WALK tier (spec §5.1: Roam default = 75%)
    this.engine.setHardwareScalingLevel(this.levels.WALK);
  }

  get currentTier(): ResolutionTier {
    return this._currentTier;
  }

  setTier(tier: ResolutionTier): void {
    if (this._currentTier === tier) return;
    this._currentTier = tier;
    this.engine.setHardwareScalingLevel(this.levels[tier]);
  }
}
