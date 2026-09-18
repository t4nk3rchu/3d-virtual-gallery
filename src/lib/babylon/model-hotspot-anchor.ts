/**
 * Task 6: 3D hotspot anchor serialization
 *
 * A hotspot placed on a MODEL_3D artwork is anchored to a point + surface
 * normal in the model's *local* space (not world space), so the anchor stays
 * valid regardless of where/how the model is placed in the roam scene.
 */
import { Vector3 } from '@babylonjs/core';

export function serializeAnchor(point: Vector3, normal: Vector3): string {
  return JSON.stringify({ p: [point.x, point.y, point.z], n: [normal.x, normal.y, normal.z] });
}

export function parseAnchor(json: string | null): { p: Vector3; n: Vector3 } | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as { p: number[]; n: number[] };
    if (!Array.isArray(o.p) || !Array.isArray(o.n)) return null;
    return { p: Vector3.FromArray(o.p), n: Vector3.FromArray(o.n) };
  } catch {
    return null;
  }
}
