import { DirectionalLight, Vector3, type Scene, type Camera } from '@babylonjs/core';

/**
 * Key + rim lights so a standalone model reads against its backdrop (used by the
 * 360 viewer and the studio hotspot editor). Shadowless — negligible cost.
 *
 * When a `camera` is given, the key light tracks the camera each frame (a
 * "headlight") so the side being viewed stays lit as the visitor orbits, instead
 * of a world-fixed light that leaves the far side dark. The rim stays world-fixed
 * for edge definition.
 */
export function addKeyRimLights(scene: Scene, camera?: Camera): void {
  const key = new DirectionalLight('modelKey', new Vector3(-0.4, -1, -0.6), scene);
  key.intensity = 1.1;
  const rim = new DirectionalLight('modelRim', new Vector3(0.5, 0.35, 1), scene);
  rim.intensity = 0.6;

  if (camera) {
    scene.onBeforeRenderObservable.add(() => {
      key.direction = camera.getForwardRay().direction;
    });
  }
}
