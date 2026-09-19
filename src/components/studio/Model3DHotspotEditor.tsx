/**
 * Task 6: 3D hotspot placement editor
 *
 * Loads the FULL-resolution MODEL_3D model (not the roam proxy) into a small
 * standalone Babylon scene so the curator can click directly on the model
 * surface to drop a hotspot. The click captures a pick point + surface normal
 * in the model ROOT's local space (see `model-hotspot-anchor.ts`) — the same
 * frame the 360 viewer projects from — so a marker stays put regardless of how
 * the model is later placed/scaled in the roam scene. Placed hotspots (existing
 * and just-dropped) render as small spheres on the model surface.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Vector3,
  ArcRotateCamera,
  PointerEventTypes,
  SceneLoader,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  type AbstractMesh,
  type Scene,
  type Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { initScene } from '../../lib/babylon/engine';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { serializeAnchor, parseAnchor } from '../../lib/babylon/model-hotspot-anchor';

interface Model3DHotspotEditorProps {
  fullModelFileId: string;
  /** Version cache-buster (e.g. artwork.updated_at) so edits don't serve stale bytes. */
  version?: string | number;
  /** Existing hotspot anchors — rendered as gold marker spheres on the model. */
  existingAnchors?: Array<{ id: string; anchor_3d_json: string | null }>;
  onDropHotspot(anchorJson: string): void;
}

const GOLD = new Color3(0.79, 0.64, 0.36);
const SON = new Color3(0.7, 0.23, 0.13);

export function Model3DHotspotEditor({
  fullModelFileId,
  version,
  existingAnchors,
  onDropHotspot,
}: Model3DHotspotEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDropHotspotRef = useRef(onDropHotspot);
  onDropHotspotRef.current = onDropHotspot;

  const sceneRef = useRef<Scene | null>(null);
  const rootRef = useRef<AbstractMesh | null>(null);
  const markerDiaRef = useRef(0.06);
  const existingMarkersRef = useRef<Mesh[]>([]);
  const pendingMarkerRef = useRef<Mesh | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);

  const makeMarker = (scene: Scene, world: Vector3, color: Color3, name: string): Mesh => {
    const s = MeshBuilder.CreateSphere(name, { diameter: markerDiaRef.current, segments: 10 }, scene);
    s.position = world;
    s.isPickable = false; // never blocks a fresh click-through to the model surface
    const mat = new StandardMaterial(`${name}_mat`, scene);
    mat.emissiveColor = color;
    mat.disableLighting = true;
    s.material = mat;
    return s;
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let disposed = false;

    const sceneHandle = initScene(canvas);
    const { scene } = sceneHandle;
    sceneRef.current = scene;
    // A neutral warm-grey studio backdrop (#C7C4BC) — light enough that dark
    // models (bronze, wood, stone) read clearly, but distinctly deeper/cooler
    // than the parchment modal card so the canvas reads as its own preview
    // viewport rather than washing into the surrounding panel.
    scene.clearColor = new Color4(0.78, 0.769, 0.737, 1);

    const camera = new ArcRotateCamera('HotspotEditorCamera', -Math.PI / 2, Math.PI / 2.5, 3, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 40;
    camera.lowerRadiusLimit = 0.1;
    camera.upperRadiusLimit = 50;

    const url = proxyMediaUrl(fullModelFileId, version);

    SceneLoader.ImportMesh('', url, '', scene, (meshes) => {
      if (disposed) return;
      for (const m of meshes) m.isPickable = true;
      const root = meshes[0];
      if (root) {
        rootRef.current = root;
        root.computeWorldMatrix(true);
        const { min, max } = root.getHierarchyBoundingVectors(true);
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min).length();
        markerDiaRef.current = Math.max(0.02, size * 0.03); // scale markers to the model
        camera.setTarget(center);
        camera.radius = Math.max(0.5, size * 1.5);
      }
      setLoading(false);
      setModelReady(true);
    }, undefined, (_s, msg) => {
      if (disposed) return;
      setLoadError(msg || 'Failed to load model.');
      setLoading(false);
    });

    const pointerObserver = scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERPICK) return;
      const hit = pi.pickInfo;
      const root = rootRef.current;
      if (!hit?.hit || !hit.pickedPoint || !hit.pickedMesh || !root) return;

      // Capture in the model ROOT's local space (the same frame the 360 viewer
      // projects from), NOT the picked submesh's — otherwise a multi-node glTF
      // renders the pin in the wrong spot.
      const invRoot = root.getWorldMatrix().clone().invert();
      const localPoint = Vector3.TransformCoordinates(hit.pickedPoint, invRoot);
      const worldNormal = hit.getNormal(true) ?? new Vector3(0, 0, 1);
      const localNormal = Vector3.TransformNormal(worldNormal, invRoot).normalize();

      // Immediate visual feedback: a red "pending" marker at the clicked point.
      pendingMarkerRef.current?.dispose();
      pendingMarkerRef.current = makeMarker(scene, hit.pickedPoint.clone(), SON, 'pending_hotspot_marker');

      onDropHotspotRef.current(serializeAnchor(localPoint, localNormal));
    });

    return () => {
      disposed = true;
      scene.onPointerObservable.remove(pointerObserver);
      existingMarkersRef.current = [];
      pendingMarkerRef.current = null;
      rootRef.current = null;
      sceneRef.current = null;
      setModelReady(false);
      sceneHandle.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullModelFileId, version]);

  // Render/refresh gold markers for saved hotspots (and clear the pending marker,
  // since a save turns the pending pin into an existing one).
  useEffect(() => {
    const scene = sceneRef.current;
    const root = rootRef.current;
    if (!modelReady || !scene || !root) return;

    for (const m of existingMarkersRef.current) m.dispose();
    existingMarkersRef.current = [];
    pendingMarkerRef.current?.dispose();
    pendingMarkerRef.current = null;

    root.computeWorldMatrix(true);
    const world = root.getWorldMatrix();
    for (const h of existingAnchors ?? []) {
      const parsed = parseAnchor(h.anchor_3d_json);
      if (!parsed) continue;
      const worldPoint = Vector3.TransformCoordinates(parsed.p, world);
      existingMarkersRef.current.push(makeMarker(scene, worldPoint, GOLD, `hotspot_marker_${h.id}`));
    }
  }, [existingAnchors, modelReady]);

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
    </div>
  );
}
