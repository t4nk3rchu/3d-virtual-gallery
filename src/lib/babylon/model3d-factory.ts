/**
 * Task 4: Roam proxy factory — MODEL_3D
 *
 * Loads a MODEL_3D artwork's decimated low-poly proxy .glb into the roam
 * scene at its placed transform. Full-res model swap-in is a later task.
 */
import type { Scene, AbstractMesh } from '@babylonjs/core';
import { Vector3, SceneLoader, Mesh } from '@babylonjs/core';
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
 * Create a MODEL_3D artwork. A GLB loads asynchronously and imports as a mesh
 * hierarchy, but the studio gizmo/selection and viewer focus need a single,
 * stable object reference *synchronously* — so we return an empty "anchor" mesh
 * placed at the transform now, and parent the loaded GLB to it once it arrives.
 * Moving/rotating/scaling the anchor moves the whole model; the anchor's
 * transform is what persists. Returns the anchor immediately.
 */
export function createModel3DArtwork(scene: Scene, artwork: Artwork, onLoaded?: () => void): AbstractMesh {
  const t = deserializeTransform(artwork.transform_json);

  const anchor = new Mesh(artwork.id, scene);
  anchor.position = new Vector3(...t.position);
  anchor.rotation = new Vector3(...t.rotation);
  anchor.scaling = new Vector3(...t.scale);
  anchor.isPickable = false; // no geometry of its own; submeshes carry picking
  anchor.metadata = { artworkId: artwork.id, isModel3D: true };

  const url = resolveModelProxyUrl(artwork);
  if (!url) { onLoaded?.(); return anchor; }

  SceneLoader.ImportMesh('', url, '', scene, (meshes) => {
    // meshes[0] is the glTF __root__, which carries the RH→LH coordinate
    // conversion — keep its own transform, zero its position, and parent it to
    // the anchor (which holds placement). Never overwrite root.rotation, or the
    // model loads mirrored/rotated.
    const root = meshes[0];
    if (root) {
      root.parent = anchor;
      root.position = Vector3.Zero();
    }
    for (const m of meshes) {
      m.isPickable = true;
      m.metadata = { ...(m.metadata ?? {}), artworkId: artwork.id, isModel3D: true };
    }
    onLoaded?.();
  }, undefined, (_s, msg) => {
    console.error(`[model3d-factory] proxy load failed for ${artwork.id}: ${msg}`);
    onLoaded?.();
  });

  return anchor;
}
