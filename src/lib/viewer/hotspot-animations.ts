/**
 * Hotspot Camera Transition Animation Engine
 *
 * Provides extensible animation presets and interpolation mathematics for
 * smooth camera transitions between hotspots in Inspect Mode.
 */

export type HotspotTransition =
  | 'arc_dip'
  | 'linear_glide'
  | 'deep_pullback'
  | 'instant_cut'
  | 'spring_overshoot';

export interface HotspotAnimationState {
  x: number;
  y: number;
  s: number;
  rx?: number;
  ry?: number;
}

export interface HotspotAnimationPreset {
  id: HotspotTransition;
  label: string;
  description: string;
  durationMs: number;
  interpolate(
    from: HotspotAnimationState,
    to: HotspotAnimationState,
    t: number, // normalized time 0..1
    overviewScale?: number
  ): HotspotAnimationState;
}

// ─── Standard Easing Functions ───────────────────────────────────────────────

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6 * t) * Math.cos(6.5 * t);
}

// ─── Animation Presets Registry ──────────────────────────────────────────────

export const HOTSPOT_TRANSITIONS: HotspotAnimationPreset[] = [
  {
    id: 'arc_dip',
    label: 'Cinematic Arc Flight',
    description: 'Smooth drone flight with a subtle zoom pullback arc mid-flight.',
    durationMs: 1100,
    interpolate(from, to, t) {
      const k = easeInOutCubic(t);
      const midS = (from.s + to.s) / 2;
      const dipS = Math.max(0.4, midS * 0.78); // subtle ~22% gentle dip
      const dipDrop = Math.max(0, midS - dipS);

      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      const baseS = from.s + (to.s - from.s) * k;
      const s = Math.max(0.2, baseS - dipDrop * Math.sin(Math.PI * t));

      return { x, y, s };
    },
  },
  {
    id: 'linear_glide',
    label: 'Linear Pan & Zoom Glide',
    description: 'Smooth direct trajectory panning straight across the canvas.',
    durationMs: 850,
    interpolate(from, to, t) {
      const k = easeInOutCubic(t);
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      const s = from.s + (to.s - from.s) * k;
      return { x, y, s };
    },
  },
  {
    id: 'deep_pullback',
    label: 'Dramatic Overview Pullback',
    description: 'Pulls camera back to full artwork overview before diving in.',
    durationMs: 1400,
    interpolate(from, to, t, overviewScale = 0.5) {
      const k = easeInOutCubic(t);
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;

      const baseS = from.s + (to.s - from.s) * k;
      const targetMinScale = Math.min(overviewScale, Math.min(from.s, to.s) * 0.45);
      const maxDrop = Math.max(0, baseS - targetMinScale);
      const s = Math.max(0.15, baseS - maxDrop * Math.sin(Math.PI * t));

      return { x, y, s };
    },
  },
  {
    id: 'instant_cut',
    label: 'Instant Museum Snap',
    description: 'Crisp camera jump with a rapid smooth micro-settle.',
    durationMs: 250,
    interpolate(from, to, t) {
      const k = easeOutCubic(t);
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      const s = from.s + (to.s - from.s) * k;
      return { x, y, s };
    },
  },
  {
    id: 'spring_overshoot',
    label: 'Elastic Spring Bounce',
    description: 'Dynamic camera flight with an energetic bounce at arrival.',
    durationMs: 1050,
    interpolate(from, to, t) {
      const k = easeOutElastic(t);
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      const s = from.s + (to.s - from.s) * k;
      return { x, y, s };
    },
  },
];

const PRESETS_MAP = new Map<HotspotTransition, HotspotAnimationPreset>(
  HOTSPOT_TRANSITIONS.map((preset) => [preset.id, preset])
);

/**
 * Retrieve an animation preset by its ID, with default fallback to 'arc_dip'.
 */
export function getHotspotAnimation(
  type?: HotspotTransition | string | null
): HotspotAnimationPreset {
  if (type && PRESETS_MAP.has(type as HotspotTransition)) {
    return PRESETS_MAP.get(type as HotspotTransition)!;
  }
  return PRESETS_MAP.get('arc_dip')!;
}

/**
 * Interpolate state between two hotspot camera coordinates using the selected animation preset.
 */
export function interpolateHotspotTransition(
  type: HotspotTransition | undefined,
  from: HotspotAnimationState,
  to: HotspotAnimationState,
  progress: number,
  overviewScale?: number
): HotspotAnimationState {
  const preset = getHotspotAnimation(type);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return preset.interpolate(from, to, clampedProgress, overviewScale);
}
