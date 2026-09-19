import { DirectionalLight, Vector3, type Scene } from '@babylonjs/core';

/**
 * Key + rim lights so a standalone model reads against its backdrop (used by the
 * 360 viewer and the studio hotspot editor). Shadowless — negligible cost.
 */
export function addKeyRimLights(scene: Scene): void {
  const key = new DirectionalLight('modelKey', new Vector3(-0.4, -1, -0.6), scene);
  key.intensity = 1.1;
  const rim = new DirectionalLight('modelRim', new Vector3(0.5, 0.35, 1), scene);
  rim.intensity = 0.6;
}
