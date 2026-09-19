import { RawCubeTexture, Texture, Constants, type Scene } from '@babylonjs/core';

/**
 * Image-based lighting (IBL) for the scene, generated procedurally — no asset,
 * nothing fetched.
 *
 * glTF models use PBR materials, and PBR metals show almost entirely as
 * reflections of the environment: with no `scene.environmentTexture` a metallic
 * surface (e.g. a bronze drum) renders near-black. This builds a 256px "studio"
 * cube with actual soft-box light sources (a bright key overhead-front, a side
 * fill, and a back rim) over a warm floor-to-sky gradient. Metals reflect those
 * bright panels — so they read as metal ("sparkle") rather than a flat wash.
 *
 * One shared texture, O(1) regardless of model count; ~a few MB of VRAM; the
 * pixel data is generated once on the CPU (tens of ms). Nothing is downloaded,
 * so it costs zero load-time bandwidth — cheaper on mobile than a real .env.
 */

const FACE_SIZE = 256;

/** Smooth 0→1 ramp between edge0 and edge1. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Unit direction for texel (u,v in [-1,1]) on cube face `f` (order +X,-X,+Y,-Y,+Z,-Z). */
function dirFor(f: number, u: number, v: number): [number, number, number] {
  let x: number, y: number, z: number;
  switch (f) {
    case 0: x = 1; y = -v; z = -u; break;   // +X
    case 1: x = -1; y = -v; z = u; break;   // -X
    case 2: x = u; y = 1; z = v; break;     // +Y
    case 3: x = u; y = -1; z = -v; break;   // -Y
    case 4: x = u; y = -v; z = 1; break;    // +Z
    default: x = -u; y = -v; z = -1; break; // -Z
  }
  const inv = 1 / Math.hypot(x, y, z);
  return [x * inv, y * inv, z * inv];
}

// Studio light sources (direction the light comes FROM) + strength.
const LIGHTS: Array<{ d: [number, number, number]; tight: number; gain: number }> = [
  { d: normalize(0.25, 0.9, 0.35), tight: 0.9, gain: 1.6 },   // key, overhead-front
  { d: normalize(-0.8, 0.3, 0.4), tight: 0.93, gain: 0.9 },   // side fill
  { d: normalize(0.3, 0.25, -0.9), tight: 0.95, gain: 0.7 },  // back rim
];

function normalize(x: number, y: number, z: number): [number, number, number] {
  const inv = 1 / Math.hypot(x, y, z);
  return [x * inv, y * inv, z * inv];
}

/** Studio radiance (0..~) for a world direction. */
function studioColor(dx: number, dy: number, dz: number): [number, number, number] {
  // Base: warm floor→sky gradient.
  const up = (dy + 1) / 2; // 0 down, 1 up
  const base = 0.06 + 0.5 * smoothstep(0, 1, up);
  let r = base * 1.0, g = base * 0.98, b = base * 0.92;

  // Add each soft-box where the direction points near the light.
  for (const l of LIGHTS) {
    const dot = dx * l.d[0] + dy * l.d[1] + dz * l.d[2];
    const s = smoothstep(l.tight, 1, dot) * l.gain;
    if (s > 0) { r += s; g += s * 0.99; b += s * 0.95; }
  }
  return [r, g, b];
}

function makeFace(f: number): Uint8Array {
  const n = FACE_SIZE;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    const v = (y + 0.5) / n * 2 - 1;
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n * 2 - 1;
      const [dx, dy, dz] = dirFor(f, u, v);
      const [cr, cg, cb] = studioColor(dx, dy, dz);
      const o = (y * n + x) * 4;
      data[o] = Math.min(255, cr * 255);
      data[o + 1] = Math.min(255, cg * 255);
      data[o + 2] = Math.min(255, cb * 255);
      data[o + 3] = 255;
    }
  }
  return data;
}

export function applyStudioEnvironment(scene: Scene, intensity = 0.55): void {
  const faces = [makeFace(0), makeFace(1), makeFace(2), makeFace(3), makeFace(4), makeFace(5)];
  const env = new RawCubeTexture(
    scene,
    faces,
    FACE_SIZE,
    Constants.TEXTUREFORMAT_RGBA,
    Constants.TEXTURETYPE_UNSIGNED_BYTE,
    true,   // generateMipMaps (softer specular for rough surfaces)
    false,  // invertY
    Texture.TRILINEAR_SAMPLINGMODE
  );
  scene.environmentTexture = env;
  scene.environmentIntensity = intensity;
}
