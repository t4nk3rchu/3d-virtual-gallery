import { RawCubeTexture, Texture, Constants, type Scene } from '@babylonjs/core';

/**
 * Image-based lighting (IBL) for the scene, generated procedurally — no asset.
 *
 * glTF models use PBR materials, and PBR metals show almost entirely as
 * reflections of the environment: with no `scene.environmentTexture` a metallic
 * surface (e.g. a bronze drum) renders near-black. This builds a small neutral
 * "studio" cube (bright overhead → mid sides → dark floor) and sets it as the
 * scene environment. Babylon derives diffuse irradiance + specular reflection
 * from it, so every PBR object in the scene is lit correctly — one shared
 * texture, O(1) regardless of how many models are in the room. A few KB in
 * memory; nothing is fetched.
 */
export function applyStudioEnvironment(scene: Scene, intensity = 0.5): void {
  const size = 32;
  const rowRGBA = size * 4;

  // A solid face (top = sky, bottom = floor).
  const solid = (r: number, g: number, b: number): Uint8Array => {
    const d = new Uint8Array(size * size * 4);
    for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    return d;
  };

  // A side face: bright (sky) at the top rows fading to dark (floor) at the bottom.
  const side = (): Uint8Array => {
    const d = new Uint8Array(size * size * 4);
    const topC = [235, 232, 222];
    const botC = [34, 31, 26];
    for (let y = 0; y < size; y++) {
      const t = y / (size - 1);
      const r = Math.round(topC[0] + (botC[0] - topC[0]) * t);
      const g = Math.round(topC[1] + (botC[1] - topC[1]) * t);
      const b = Math.round(topC[2] + (botC[2] - topC[2]) * t);
      for (let x = 0; x < size; x++) {
        const o = y * rowRGBA + x * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    return d;
  };

  const top = solid(240, 237, 228);
  const bottom = solid(30, 27, 23);
  // Face order: +X, -X, +Y, -Y, +Z, -Z
  const faces = [side(), side(), top, bottom, side(), side()];

  const env = new RawCubeTexture(
    scene,
    faces,
    size,
    Constants.TEXTUREFORMAT_RGBA,
    Constants.TEXTURETYPE_UNSIGNED_BYTE,
    true,   // generateMipMaps (softer specular for rough surfaces)
    false,  // invertY
    Texture.TRILINEAR_SAMPLINGMODE
  );

  scene.environmentTexture = env;
  scene.environmentIntensity = intensity;
}
