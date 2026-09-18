import { Vector3 } from '@babylonjs/core';

/**
 * Pin diameter in px, scaled linearly with camera radius and clamped.
 * Zoomed out (radius near maxRadius) -> maxPx so the hotspot is noticeable;
 * zoomed in (radius near minRadius) -> minPx so it does not obstruct.
 */
export function pinScaleForRadius(
  radius: number, minRadius: number, maxRadius: number, minPx: number, maxPx: number,
): number {
  const span = maxRadius - minRadius;
  const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (radius - minRadius) / span));
  return minPx + t * (maxPx - minPx);
}

/**
 * True when the hotspot's surface faces the camera. Uses the stored surface
 * normal (world space) vs. the direction from the point to the camera — a cheap
 * per-frame occlusion test with no raycast.
 */
export function isPointFacingCamera(
  pointWorld: Vector3, normalWorld: Vector3, cameraPos: Vector3,
): boolean {
  const toCamera = cameraPos.subtract(pointWorld);
  return Vector3.Dot(normalWorld, toCamera) > 0;
}
