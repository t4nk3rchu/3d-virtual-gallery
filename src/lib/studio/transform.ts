/**
 * Task 11: Transform serialization — artwork placement
 *
 * Persists gizmo position/rotation/scale as JSON to the CRUD API.
 * Round-trip: serialize → store in DB → deserialize → back to Babylon.
 */

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function deserializeTransform(json: string): Transform {
  try {
    const parsed = JSON.parse(json) as Transform;
    if (!parsed.position || !parsed.rotation || !parsed.scale) {
      throw new Error('Invalid transform');
    }
    return parsed;
  } catch {
    return { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  }
}

export function isValidTransform(json: string): boolean {
  try {
    const t = JSON.parse(json) as Transform;
    return (
      Array.isArray(t.position) && t.position.length === 3 &&
      Array.isArray(t.rotation) && t.rotation.length === 3 &&
      Array.isArray(t.scale) && t.scale.length === 3 &&
      t.scale.every((v: number) => v > 0)
    );
  } catch {
    return false;
  }
}
