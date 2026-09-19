/**
 * Task 6: 3D hotspot placement editor
 *
 * Loads the FULL-resolution MODEL_3D model into a small standalone Babylon
 * scene. The curator clicks the model surface to drop/reposition a hotspot; the
 * click captures a pick point + surface normal in the model ROOT's local space
 * (see `model-hotspot-anchor.ts`) — the same frame the 360 viewer projects from.
 *
 * Markers are fully driven by props:
 *   - each saved hotspot renders as a gold sphere; the one being edited
 *     (`selectedId`) renders larger in son-red and is CLICK-THROUGH so a click
 *     on the surface repositions it;
 *   - non-selected markers are pickable — clicking one selects it (`onSelectHotspot`);
 *   - an unsaved new pin (`draftAnchorJson` with no selection) renders son-red.
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
import { addKeyRimLights } from '../../lib/babylon/model-lights';
import { getModelBounds } from '../../lib/babylon/model-bounds';

interface Model3DHotspotEditorProps {
  fullModelFileId: string;
  /** Version cache-buster (e.g. artwork.updated_at) so edits don't serve stale bytes. */
  version?: string | number;
  /** Saved hotspot anchors — rendered as marker spheres. */
  existingAnchors?: Array<{ id: string; anchor_3d_json: string | null }>;
  /** The hotspot currently being edited (highlighted + click-through for reposition). */
  selectedId?: string | null;
  /** Unsaved anchor: a new pin (no selection) or the repositioned anchor of the selected one. */
  draftAnchorJson?: string | null;
  /** A non-selected marker was clicked. */
  onSelectHotspot?(id: string): void;
  /** The model surface was clicked (drop new / reposition selected). */
  onDropHotspot(anchorJson: string): void;
}

const GOLD = new Color3(0.79, 0.64, 0.36);
const SON = new Color3(0.7, 0.23, 0.13);

export function Model3DHotspotEditor({
  fullModelFileId,
  version,
  existingAnchors,
  selectedId,
  draftAnchorJson,
  onSelectHotspot,
  onDropHotspot,
}: Model3DHotspotEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDropHotspotRef = useRef(onDropHotspot);
  onDropHotspotRef.current = onDropHotspot;
  const onSelectHotspotRef = useRef(onSelectHotspot);
  onSelectHotspotRef.current = onSelectHotspot;

  const sceneRef = useRef<Scene | null>(null);
  const rootRef = useRef<AbstractMesh | null>(null);
  const markerDiaRef = useRef(0.06);
  const markersRef = useRef<Mesh[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);

  const makeMarker = (scene: Scene, world: Vector3, color: Color3, name: string, highlight: boolean): Mesh => {
    const dia = markerDiaRef.current * (highlight ? 1.6 : 1);
    const s = MeshBuilder.CreateSphere(name, { diameter: dia, segments: 12 }, scene);
    s.position = world;
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
    // A neutral warm-grey studio backdrop (#C7C4BC) so dark models read against
    // it while staying distinct from the parchment modal card.
    scene.clearColor = new Color4(0.78, 0.769, 0.737, 1);

    const camera = new ArcRotateCamera('HotspotEditorCamera', -Math.PI / 2, Math.PI / 2.5, 3, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 40;
    // Radius limits are set from the model bounds after load (below).

    // Key + rim lights so surface detail reads clearly while placing hotspots.
    addKeyRimLights(scene);

    const url = proxyMediaUrl(fullModelFileId, version);

    SceneLoader.ImportMesh('', url, '', scene, (meshes) => {
      if (disposed) return;
      // The model surface must be pickable so clicks land on it. (Markers set
      // their own pickability per render.)
      for (const m of meshes) m.isPickable = true;
      const root = meshes[0];
      if (root) {
        rootRef.current = root;
        const { center, size } = getModelBounds(root);
        markerDiaRef.current = Math.max(0.02, size * 0.03);
        // Keep the camera outside the model surface (a distance boundary, like the
        // room walls) so it can't clip through / dive inside when zooming.
        const boundRadius = Math.max(0.5, size * 0.75);
        camera.setTarget(center);
        camera.radius = boundRadius * 2;
        camera.lowerRadiusLimit = boundRadius; // don't get closer than the bounding sphere
        camera.upperRadiusLimit = boundRadius * 4;
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
      if (!hit?.hit || !hit.pickedMesh) return;

      // Clicked a (non-selected) marker → select that hotspot.
      const markerId = hit.pickedMesh.metadata?.hotspotMarkerId as string | undefined;
      if (markerId) {
        onSelectHotspotRef.current?.(markerId);
        return;
      }

      // Clicked the model surface → drop a new pin / reposition the selected one.
      const root = rootRef.current;
      if (!hit.pickedPoint || !root) return;
      const invRoot = root.getWorldMatrix().clone().invert();
      const localPoint = Vector3.TransformCoordinates(hit.pickedPoint, invRoot);
      const worldNormal = hit.getNormal(true) ?? new Vector3(0, 0, 1);
      const localNormal = Vector3.TransformNormal(worldNormal, invRoot).normalize();
      onDropHotspotRef.current(serializeAnchor(localPoint, localNormal));
    });

    return () => {
      disposed = true;
      scene.onPointerObservable.remove(pointerObserver);
      markersRef.current = [];
      rootRef.current = null;
      sceneRef.current = null;
      setModelReady(false);
      sceneHandle.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullModelFileId, version]);

  // Render markers from props. Selected marker is son-red + larger + click-through;
  // others are gold + pickable; an unsaved new pin is son-red.
  useEffect(() => {
    const scene = sceneRef.current;
    const root = rootRef.current;
    if (!modelReady || !scene || !root) return;

    for (const m of markersRef.current) m.dispose();
    markersRef.current = [];

    root.computeWorldMatrix(true);
    const world = root.getWorldMatrix();

    for (const h of existingAnchors ?? []) {
      const isSel = h.id === selectedId;
      const src = isSel && draftAnchorJson ? draftAnchorJson : h.anchor_3d_json;
      const parsed = parseAnchor(src);
      if (!parsed) continue;
      const worldPoint = Vector3.TransformCoordinates(parsed.p, world);
      const marker = makeMarker(scene, worldPoint, isSel ? SON : GOLD, `hotspot_marker_${h.id}`, isSel);
      // Selected marker is click-through so a surface click repositions it;
      // non-selected markers are pickable so clicking one selects it.
      marker.isPickable = !isSel;
      marker.metadata = { hotspotMarkerId: h.id };
      markersRef.current.push(marker);
    }

    // A brand-new (unsaved, unselected) pin.
    if (!selectedId && draftAnchorJson) {
      const parsed = parseAnchor(draftAnchorJson);
      if (parsed) {
        const worldPoint = Vector3.TransformCoordinates(parsed.p, world);
        const p = makeMarker(scene, worldPoint, SON, 'pending_hotspot_marker', true);
        p.isPickable = false;
        markersRef.current.push(p);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAnchors, selectedId, draftAnchorJson, modelReady]);

  return (
    <div className="model3d-hotspot-editor">
      <p className="canvas-instruction">
        Click the model to drop a pin, click a gold pin to edit it, or click the surface again to move a selected pin.
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
