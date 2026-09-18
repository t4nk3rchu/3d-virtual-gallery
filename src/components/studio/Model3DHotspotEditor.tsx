/**
 * Task 6: 3D hotspot placement editor
 *
 * Loads the FULL-resolution MODEL_3D model (not the roam proxy) into a small
 * standalone Babylon scene so the curator can click directly on the model
 * surface to drop a hotspot. The click captures a pick point + surface normal
 * in the model's *local* space (see `model-hotspot-anchor.ts`), independent
 * of how the model is later placed/scaled in the roam scene.
 */
import { useEffect, useRef, useState } from 'react';
import { Vector3, ArcRotateCamera, PointerEventTypes, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { initScene } from '../../lib/babylon/engine';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { serializeAnchor, parseAnchor } from '../../lib/babylon/model-hotspot-anchor';

interface Model3DHotspotEditorProps {
  fullModelFileId: string;
  /** Version cache-buster (e.g. artwork.updated_at) so edits don't serve stale bytes. */
  version?: string | number;
  /** Existing hotspot anchors, shown only as a text count (not rendered as in-scene markers). */
  existingAnchors?: Array<{ id: string; anchor_3d_json: string | null }>;
  onDropHotspot(anchorJson: string): void;
}

export function Model3DHotspotEditor({
  fullModelFileId,
  version,
  existingAnchors,
  onDropHotspot,
}: Model3DHotspotEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDropHotspotRef = useRef(onDropHotspot);
  onDropHotspotRef.current = onDropHotspot;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let disposed = false;

    const sceneHandle = initScene(canvas);
    const { scene } = sceneHandle;

    const camera = new ArcRotateCamera(
      'HotspotEditorCamera',
      -Math.PI / 2,
      Math.PI / 2.5,
      3,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 40;
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 50;

    const url = proxyMediaUrl(fullModelFileId, version);

    SceneLoader.ImportMesh(
      '',
      url,
      '',
      scene,
      (meshes) => {
        if (disposed) return;
        for (const m of meshes) m.isPickable = true;
        // Frame the camera on the loaded model.
        const root = meshes[0];
        if (root) {
          root.computeWorldMatrix(true);
          const { min, max } = root.getHierarchyBoundingVectors(true);
          const center = min.add(max).scale(0.5);
          const size = max.subtract(min).length();
          camera.setTarget(center);
          camera.radius = Math.max(0.5, size * 1.5);
        }
        setLoading(false);
      },
      undefined,
      (_s, msg) => {
        if (disposed) return;
        setLoadError(msg || 'Failed to load model.');
        setLoading(false);
      }
    );

    const pointerObserver = scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERPICK) return;
      const hit = pi.pickInfo;
      if (!hit?.hit || !hit.pickedPoint || !hit.pickedMesh) return;
      // Local-space point + normal (so the anchor is independent of placement).
      const inv = hit.pickedMesh.getWorldMatrix().clone().invert();
      const localPoint = Vector3.TransformCoordinates(hit.pickedPoint, inv);
      const worldNormal = hit.getNormal(true) ?? new Vector3(0, 0, 1);
      const localNormal = Vector3.TransformNormal(worldNormal, inv).normalize();
      onDropHotspotRef.current(serializeAnchor(localPoint, localNormal));
    });

    return () => {
      disposed = true;
      scene.onPointerObservable.remove(pointerObserver);
      sceneHandle.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullModelFileId, version]);

  return (
    <div className="model3d-hotspot-editor">
      <p className="canvas-instruction">
        Click anywhere on the 3D model to drop a new interpretive hotspot pin.
      </p>
      <div className="model3d-hotspot-canvas-wrapper" style={{ position: 'relative', width: '100%', height: '420px' }}>
        <canvas
          ref={canvasRef}
          className="model3d-hotspot-canvas"
          style={{ width: '100%', height: '100%', display: 'block' }}
          onContextMenu={(e) => e.preventDefault()}
        />
        {loading && !loadError && (
          <div className="model3d-hotspot-loading" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <p>Loading 3D model…</p>
          </div>
        )}
        {loadError && (
          <div className="model3d-hotspot-error" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <p>Failed to load model: {loadError}</p>
          </div>
        )}
      </div>
      {existingAnchors && existingAnchors.length > 0 && (
        <p className="hint">
          {existingAnchors.filter((h) => parseAnchor(h.anchor_3d_json)).length} existing hotspot(s) placed on this model.
        </p>
      )}
    </div>
  );
}
