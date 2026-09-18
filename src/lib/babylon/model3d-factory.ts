/**
 * Task 4: Roam proxy factory — MODEL_3D
 *
 * Loads a MODEL_3D artwork's decimated low-poly proxy .glb into the roam
 * scene at its placed transform. Full-res model swap-in is a later task.
 */
import type { Scene } from '@babylonjs/core';
import { Vector3, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Artwork } from '../../types/schema';
import { proxyMediaUrl } from '../media/gdrive';
import { deserializeTransform } from '../studio/transform';

/** Roam proxy media URL, or null if this model has no generated proxy yet. */
export function resolveModelProxyUrl(artwork: Artwork): string | null {
  if (!artwork.model_proxy_file_id) return null;
  return proxyMediaUrl(artwork.model_proxy_file_id, artwork.updated_at);
}

/**
 * Load the low-poly proxy GLB into the roam scene at the placed transform.
 * Root mesh is tagged with metadata so hover/click interaction can resolve it.
 */
export function createModel3DArtwork(scene: Scene, artwork: Artwork, onLoaded?: () => void): void {
  const url = resolveModelProxyUrl(artwork);
  if (!url) { onLoaded?.(); return; }

  const t = deserializeTransform(artwork.transform_json);
  SceneLoader.ImportMesh('', url, '', scene, (meshes) => {
    const root = meshes[0];
    if (root) {
      root.name = artwork.id;
      root.position = new Vector3(...t.position);
      root.rotation = new Vector3(...t.rotation);
      root.scaling = new Vector3(...t.scale);
      for (const m of meshes) {
        m.isPickable = true;
        m.metadata = { ...(m.metadata ?? {}), artworkId: artwork.id, isModel3D: true };
      }
    }
    onLoaded?.();
  }, undefined, (_s, msg) => {
    console.error(`[model3d-factory] proxy load failed for ${artwork.id}: ${msg}`);
    onLoaded?.();
  });
}
