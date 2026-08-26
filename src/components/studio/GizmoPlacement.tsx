/**
 * Task 11 & Studio 3D Gizmo Placement
 *
 * Implements:
 *   - Universal ArcRotate authoring camera with WASD / Arrow keys movement
 *   - Middle mouse drag (button 1): Orbit camera around target/mouse pointer
 *   - Left mouse click (button 0): Select artwork / unfocus (no camera drag)
 *   - Right mouse drag (button 2):
 *       * Focused artwork: Directly translate artwork along view plane (camera stays still)
 *       * Unfocused roam: Smoothly pan camera through gallery with configurable panning speed
 *   - Proportional aspect ratio locked scaling (X & Y scale proportionally to avoid image distortion)
 *   - Full 2D Image, Video, and 3D Model rotation gizmo support with active drag listeners
 *   - Slide-out side panel for Curator Keybindings & Controls customization
 *   - Move / Rotate / Scale gizmo modes with live coordinate HUD
 *   - Instant camera framing on selected artwork
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Artwork, Room } from '../../types/schema';
import type { AbstractMesh } from '@babylonjs/core';
import { GizmoManager, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import { serializeTransform } from '../../lib/studio/transform';
import {
  StudioSettingsSidebar,
  getStoredStudioSettings,
  type StudioKeybindings,
} from './StudioSettingsSidebar';

interface GizmoPlacementProps {
  room: Room;
  artworks: Artwork[];
  initialSelectedArtworkId?: string;
  onArtworkTransformSaved(artworkId: string, newTransformJson: string): void;
  onClose(): void;
}

type GizmoMode = 'position' | 'rotation' | 'scale';

export function GizmoPlacement({
  room,
  artworks,
  initialSelectedArtworkId,
  onArtworkTransformSaved,
  onClose,
}: GizmoPlacementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<StudioKeybindings>(getStoredStudioSettings());
  const settingsRef = useRef<StudioKeybindings>(settings);
  settingsRef.current = settings;

  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const lockAspectRatioRef = useRef(lockAspectRatio);
  lockAspectRatioRef.current = lockAspectRatio;

  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(
    initialSelectedArtworkId || artworks[0]?.id || null
  );
  const selectedArtworkIdRef = useRef<string | null>(selectedArtworkId);
  selectedArtworkIdRef.current = selectedArtworkId;

  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('position');
  const [transformValues, setTransformValues] = useState<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>({
    position: [0, 1.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const meshesMapRef = useRef<Map<string, AbstractMesh>>(new Map());
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const rightDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Update transform values from mesh (handles both Euler and Quaternion rotations)
  const updateCoordsFromMesh = useCallback((mesh: AbstractMesh) => {
    let rx = mesh.rotation.x;
    let ry = mesh.rotation.y;
    let rz = mesh.rotation.z;

    if (mesh.rotationQuaternion) {
      const euler = mesh.rotationQuaternion.toEulerAngles();
      rx = euler.x;
      ry = euler.y;
      rz = euler.z;
      mesh.rotation.copyFromFloats(rx, ry, rz);
    }

    setTransformValues({
      position: [
        Math.round(mesh.position.x * 1000) / 1000,
        Math.round(mesh.position.y * 1000) / 1000,
        Math.round(mesh.position.z * 1000) / 1000,
      ],
      rotation: [
        Math.round(rx * 1000) / 1000,
        Math.round(ry * 1000) / 1000,
        Math.round(rz * 1000) / 1000,
      ],
      scale: [
        Math.round(mesh.scaling.x * 1000) / 1000,
        Math.round(mesh.scaling.y * 1000) / 1000,
        Math.round(mesh.scaling.z * 1000) / 1000,
      ],
    });
  }, []);

  // Select / Attach to artwork mesh
  const selectArtwork = useCallback(
    (id: string | null) => {
      setSelectedArtworkId(id);
      setStatusMessage(null);
      const gm = gizmoManagerRef.current;
      const camera = cameraRef.current;
      if (!gm) return;

      if (!id) {
        // Unfocus / Deselect
        gm.attachToMesh(null);
        return;
      }

      const mesh = meshesMapRef.current.get(id);
      if (mesh) {
        gm.attachToMesh(mesh);
        updateCoordsFromMesh(mesh);
        if (camera) {
          camera.setTarget(mesh.position.clone());
        }
      } else {
        gm.attachToMesh(null);
      }
    },
    [updateCoordsFromMesh]
  );

  // Focus / Frame camera on selected artwork
  const frameSelectedArtwork = useCallback(() => {
    if (!selectedArtworkId) return;
    const mesh = meshesMapRef.current.get(selectedArtworkId);
    const camera = cameraRef.current;
    if (mesh && camera) {
      camera.setTarget(mesh.position.clone());
      camera.radius = 3.5;
    }
  }, [selectedArtworkId]);

  // Initialize authoring Babylon scene
  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;
    let sceneHandle: import('../../lib/babylon/engine').SceneHandle | null = null;

    (async () => {
      const { initScene } = await import('../../lib/babylon/engine');
      const { loadGlbRoom } = await import('../../lib/babylon/room-loader');
      const { createArtworkMesh } = await import('../../lib/babylon/artwork-factory');

      if (disposed || !canvasRef.current) return;

      sceneHandle = initScene(canvasRef.current);
      const { scene } = sceneHandle;

      // Authoring camera: ArcRotateCamera allows orbiting & panning
      const camera = new ArcRotateCamera(
        'AuthoringCamera',
        -Math.PI / 2,
        Math.PI / 2.5,
        8,
        new Vector3(0, 1.5, 0),
        scene
      );
      camera.attachControl(canvasRef.current, true);
      camera.wheelPrecision = 20;
      camera.lowerRadiusLimit = 0.3;
      camera.upperRadiusLimit = 60;

      // ─── Button Mapping ───────────────────────────────────────────────────
      // Middle Mouse (Button 1): Orbit around mouse pointer / target
      // Left Mouse (Button 0): Unassigned for camera dragging (purely picking/UI)
      // Right Mouse (Button 2): Handled custom in onPointerMove for precise control
      const pointers = (camera.inputs.attached as Record<string, any>)?.pointers;
      if (pointers) {
        pointers.buttons = [1]; // Middle click to orbit
        pointers.panningMouseButton = 2;
      }
      (camera as any)._panningMouseButton = 2;
      camera.panningSensibility = 0; // Handled directly in onPointerMove

      camera.keysUp = [];
      camera.keysDown = [];
      camera.keysLeft = [];
      camera.keysRight = [];
      cameraRef.current = camera;

      // Load Room
      try {
        await loadGlbRoom(scene, room.glb_file_id, () => {});
      } catch (e) {
        console.error('[studio-gizmo] Failed to load room GLB:', e);
      }

      // Create artwork meshes
      meshesMapRef.current.clear();
      for (const art of artworks) {
        const mesh = createArtworkMesh(scene, art);
        if (mesh) {
          meshesMapRef.current.set(art.id, mesh);
        }
      }

      // Setup GizmoManager
      const gm = new GizmoManager(scene);
      gm.positionGizmoEnabled = true;
      gm.rotationGizmoEnabled = false;
      gm.scaleGizmoEnabled = false;
      gm.usePointerToAttachGizmos = false; // Handled explicitly
      gizmoManagerRef.current = gm;

      // Attach to initially selected artwork
      const initialId = selectedArtworkIdRef.current;
      if (initialId && meshesMapRef.current.has(initialId)) {
        const targetMesh = meshesMapRef.current.get(initialId)!;
        gm.attachToMesh(targetMesh);
        camera.setTarget(targetMesh.position.clone());
        updateCoordsFromMesh(targetMesh);
      }

      // Find artwork ID from picked mesh hierarchy
      const findArtworkId = (mesh: AbstractMesh | null): string | null => {
        let curr: AbstractMesh | null = mesh;
        while (curr) {
          if (curr.metadata?.artworkId) return curr.metadata.artworkId;
          curr = curr.parent as AbstractMesh | null;
        }
        return null;
      };

      // Pointer down handler for selection and right-click direct move / pan
      scene.onPointerDown = (evt, pickInfo) => {
        if (evt.button === 0) {
          // Left click: select artwork or unfocus
          if (pickInfo?.hit && pickInfo.pickedMesh) {
            const artworkId = findArtworkId(pickInfo.pickedMesh);
            if (artworkId) {
              // Only trigger select if not already selected (prevents re-attaching and interrupting gizmo drag)
              if (artworkId !== selectedArtworkIdRef.current) {
                selectArtwork(artworkId);
              }
              return;
            }
          }

          // If clicking on background/room while not on a gizmo, unfocus
          if (pickInfo?.hit && !findArtworkId(pickInfo.pickedMesh)) {
            const meshName = pickInfo.pickedMesh?.name.toLowerCase() || '';
            const isGizmo =
              meshName.includes('gizmo') ||
              meshName.includes('axis') ||
              meshName.includes('torus') ||
              meshName.includes('arrow') ||
              meshName.includes('plane') ||
              meshName.includes('line') ||
              meshName.includes('cylinder');
            if (!isGizmo) {
              selectArtwork(null);
            }
          }
        } else if (evt.button === 2) {
          // Right click: start drag (either direct artwork translation or smooth camera pan)
          rightDragStartRef.current = { x: evt.clientX, y: evt.clientY };
        }
      };

      // Pointer move handler for right-click direct move translation and camera pan
      scene.onPointerMove = (evt) => {
        if (rightDragStartRef.current && (evt.buttons & 2)) {
          const dx = evt.clientX - rightDragStartRef.current.x;
          const dy = evt.clientY - rightDragStartRef.current.y;
          rightDragStartRef.current = { x: evt.clientX, y: evt.clientY };

          const fwd = camera.target.subtract(camera.position);
          fwd.y = 0;
          if (fwd.lengthSquared() < 0.001) fwd.set(0, 0, 1);
          fwd.normalize();

          const camRight = Vector3.Cross(Vector3.Up(), fwd).normalize();
          const camUp = Vector3.Up();

          const activeId = selectedArtworkIdRef.current;
          if (activeId && meshesMapRef.current.has(activeId) && settingsRef.current.rightClickMode === 'move_artwork') {
            // 1. Focused Artwork: Translate artwork along view plane (camera stays completely stationary)
            const mesh = meshesMapRef.current.get(activeId)!;
            const dist = Vector3.Distance(camera.position, mesh.position);
            const sens = Math.max(0.8, dist) * 0.0018 * settingsRef.current.dragSensitivity;

            mesh.position.addInPlace(camRight.scale(dx * sens).add(camUp.scale(-dy * sens)));
            updateCoordsFromMesh(mesh);
          } else {
            // 2. Unfocused (or pan mode): Pan camera smoothly through the room with configurable speed
            const panSens = 0.0035 * (Math.max(2, camera.radius) / 8) * (settingsRef.current.panningSpeed ?? 1.0);
            const panDelta = camRight.scale(-dx * panSens).add(camUp.scale(dy * panSens));
            camera.position.addInPlace(panDelta);
            camera.target.addInPlace(panDelta);
          }
        }
      };

      scene.onPointerUp = (evt) => {
        if (evt.button === 2) {
          rightDragStartRef.current = null;
        }
      };

      // Continuous WASD + Arrow Keys camera movement loop
      const onBeforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
        const activeKeys = activeKeysRef.current;
        if (activeKeys.size === 0) return;

        const forward = camera.target.subtract(camera.position);
        forward.y = 0;
        if (forward.lengthSquared() < 0.001) forward.set(0, 0, 1);
        forward.normalize();

        // In Babylon left-handed coordinates: Up x Forward is the true Right vector
        const right = Vector3.Cross(Vector3.Up(), forward).normalize();
        const up = Vector3.Up();

        const curSettings = settingsRef.current;
        const dt = scene.getEngine().getDeltaTime() / 1000;
        const isSprint = activeKeys.has(curSettings.sprint) || activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
        const speed = (isSprint ? curSettings.cameraSpeed * 2.5 : curSettings.cameraSpeed) * dt;

        const move = Vector3.Zero();

        // User-configured keys
        if (activeKeys.has(curSettings.forward) || activeKeys.has('KeyW') || activeKeys.has('ArrowUp')) {
          move.addInPlace(forward.scale(speed));
        }
        if (activeKeys.has(curSettings.backward) || activeKeys.has('KeyS') || activeKeys.has('ArrowDown')) {
          move.addInPlace(forward.scale(-speed));
        }
        if (activeKeys.has(curSettings.right) || activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) {
          move.addInPlace(right.scale(speed)); // Strafe Right (D)
        }
        if (activeKeys.has(curSettings.left) || activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) {
          move.addInPlace(right.scale(-speed)); // Strafe Left (A)
        }
        if (activeKeys.has(curSettings.up) || activeKeys.has('KeyE') || activeKeys.has('Space')) {
          move.addInPlace(up.scale(speed));
        }
        if (activeKeys.has(curSettings.down) || activeKeys.has('KeyQ')) {
          move.addInPlace(up.scale(-speed));
        }

        if (!move.equals(Vector3.Zero())) {
          camera.position.addInPlace(move);
          camera.target.addInPlace(move);
        }
      });

      return () => {
        scene.onBeforeRenderObservable.remove(onBeforeRenderObserver);
      };
    })();

    // Keyboard event listeners for WASD navigation & Esc unfocus
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Escape') {
        selectArtwork(null);
        return;
      }

      activeKeysRef.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
    };

    const onBlur = () => {
      activeKeysRef.current.clear();
      rightDragStartRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      gizmoManagerRef.current?.dispose();
      sceneHandle?.dispose();
    };
  }, [room.glb_file_id, selectArtwork, updateCoordsFromMesh]);

  // Update gizmo active mode and wire live drag listeners on creation
  useEffect(() => {
    if (!gizmoManagerRef.current) return;
    const gm = gizmoManagerRef.current;
    gm.positionGizmoEnabled = gizmoMode === 'position';
    gm.rotationGizmoEnabled = gizmoMode === 'rotation';
    gm.scaleGizmoEnabled = gizmoMode === 'scale';

    const onPositionDrag = () => {
      if (gm.attachedMesh) {
        updateCoordsFromMesh(gm.attachedMesh);
      }
    };

    // Position Gizmo
    if (gm.gizmos.positionGizmo) {
      gm.gizmos.positionGizmo.scaleRatio = 1.2;
      gm.gizmos.positionGizmo.onDragObservable.clear();
      gm.gizmos.positionGizmo.onDragEndObservable.clear();
      gm.gizmos.positionGizmo.onDragObservable.add(onPositionDrag);
      gm.gizmos.positionGizmo.onDragEndObservable.add(onPositionDrag);
    }

    // Rotation Gizmo
    if (gm.gizmos.rotationGizmo) {
      gm.gizmos.rotationGizmo.scaleRatio = 1.3;
      gm.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
      gm.gizmos.rotationGizmo.onDragObservable.clear();
      gm.gizmos.rotationGizmo.onDragEndObservable.clear();
      gm.gizmos.rotationGizmo.onDragObservable.add(onPositionDrag);
      gm.gizmos.rotationGizmo.onDragEndObservable.add(onPositionDrag);
    }

    // Scale Gizmo (with proportional aspect ratio locking)
    if (gm.gizmos.scaleGizmo) {
      gm.gizmos.scaleGizmo.scaleRatio = 1.2;
      gm.gizmos.scaleGizmo.onDragObservable.clear();
      gm.gizmos.scaleGizmo.onDragEndObservable.clear();

      let lastScale: Vector3 | null = null;

      gm.gizmos.scaleGizmo.onDragObservable.add(() => {
        const mesh = gm.attachedMesh;
        if (!mesh) return;

        if (lockAspectRatioRef.current && lastScale) {
          const dx = Math.abs(mesh.scaling.x - lastScale.x);
          const dy = Math.abs(mesh.scaling.y - lastScale.y);
          const dz = Math.abs(mesh.scaling.z - lastScale.z);

          if (dx >= dy && dx >= dz && Math.abs(lastScale.x) > 0.0001) {
            const ratio = mesh.scaling.x / lastScale.x;
            mesh.scaling.y = Math.max(0.01, lastScale.y * ratio);
            mesh.scaling.z = Math.max(0.01, lastScale.z * ratio);
          } else if (dy >= dx && dy >= dz && Math.abs(lastScale.y) > 0.0001) {
            const ratio = mesh.scaling.y / lastScale.y;
            mesh.scaling.x = Math.max(0.01, lastScale.x * ratio);
            mesh.scaling.z = Math.max(0.01, lastScale.z * ratio);
          } else if (dz >= dx && dz >= dy && Math.abs(lastScale.z) > 0.0001) {
            const ratio = mesh.scaling.z / lastScale.z;
            mesh.scaling.x = Math.max(0.01, lastScale.x * ratio);
            mesh.scaling.y = Math.max(0.01, lastScale.y * ratio);
          }
        }

        lastScale = mesh.scaling.clone();
        updateCoordsFromMesh(mesh);
      });

      gm.gizmos.scaleGizmo.onDragEndObservable.add(() => {
        lastScale = null;
        if (gm.attachedMesh) {
          updateCoordsFromMesh(gm.attachedMesh);
        }
      });
    }
  }, [gizmoMode, updateCoordsFromMesh]);

  const handleSaveTransform = async () => {
    if (!selectedArtworkId) return;
    setSaving(true);
    setStatusMessage(null);

    const transformJson = serializeTransform(transformValues);

    try {
      const res = await fetch(`/api/artworks/${selectedArtworkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transform_json: transformJson }),
      });

      if (res.ok) {
        onArtworkTransformSaved(selectedArtworkId, transformJson);
        setStatusMessage('✓ Position saved successfully.');
      } else {
        setStatusMessage('Failed to save position.');
      }
    } catch {
      setStatusMessage('Network error saving position.');
    } finally {
      setSaving(false);
    }
  };

  const selectedArt = artworks.find((a) => a.id === selectedArtworkId);

  return (
    <div className="gizmo-placement-overlay">
      <div className="gizmo-toolbar">
        <div className="toolbar-left">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            ← Back to Artworks
          </button>
          <span className="room-badge">Room: {room.name}</span>
        </div>

        <div className="toolbar-center">
          <label htmlFor="gizmo-art-select" className="sr-only">
            Select Artwork to Move
          </label>
          <select
            id="gizmo-art-select"
            value={selectedArtworkId || ''}
            onChange={(e) => selectArtwork(e.target.value || null)}
            className="input select select--sm"
          >
            <option value="">-- No Selection (Navigate Only) --</option>
            {artworks.map((art) => (
              <option key={art.id} value={art.id}>
                {art.title} ({art.artwork_type})
              </option>
            ))}
          </select>

          {selectedArtworkId ? (
            <>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'position' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('position')}
                  title="Position Translation Gizmo"
                >
                  📍 Move
                </button>
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'rotation' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('rotation')}
                  title="Rotation Gizmo"
                >
                  🔄 Rotate
                </button>
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'scale' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('scale')}
                  title="Scale Gizmo"
                >
                  📐 Scale
                </button>
              </div>

              {gizmoMode === 'scale' && (
                <button
                  type="button"
                  className={`btn btn--sm ${lockAspectRatio ? 'btn--secondary' : 'btn--ghost'}`}
                  onClick={() => setLockAspectRatio((prev) => !prev)}
                  title={lockAspectRatio ? 'Locked: Aspect ratio is preserved proportionally' : 'Unlocked: Free independent axis scaling'}
                >
                  {lockAspectRatio ? '🔒 Lock Ratio' : '🔓 Free Scale'}
                </button>
              )}

              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={frameSelectedArtwork}
                title="Center camera on selected artwork"
              >
                🎯 Frame Artwork
              </button>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => selectArtwork(null)}
                title="Unfocus / Deselect (Esc)"
              >
                ✕ Unfocus
              </button>
            </>
          ) : (
            <span className="nav-mode-indicator">
              🎮 Roam Mode: Click an artwork to move it, or WASD to navigate
            </span>
          )}
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className={`btn btn--sm ${showSettingsSidebar ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setShowSettingsSidebar((prev) => !prev)}
            title="Configure Keybindings & Controls"
          >
            ⚙️ Controls &amp; Keys
          </button>

          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleSaveTransform}
            disabled={saving || !selectedArtworkId}
          >
            {saving ? 'Saving…' : 'Save 3D Position'}
          </button>
        </div>
      </div>

      <div className="gizmo-main-area">
        {/* 3D Canvas */}
        <canvas
          ref={canvasRef}
          className="gizmo-canvas"
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Coordinate HUD */}
        <div className="gizmo-hud">
          <h4>{selectedArt ? `Selected: ${selectedArt.title}` : 'Navigation Mode'}</h4>
          {selectedArt ? (
            <div className="hud-values">
              <span>
                Pos: [{transformValues.position[0]}, {transformValues.position[1]},{' '}
                {transformValues.position[2]}]
              </span>
              <span>
                Rot: [{transformValues.rotation[0]}, {transformValues.rotation[1]},{' '}
                {transformValues.rotation[2]}]
              </span>
              <span>
                Scale: [{transformValues.scale[0]}, {transformValues.scale[1]},{' '}
                {transformValues.scale[2]}]
              </span>
            </div>
          ) : (
            <p className="hud-unfocused">
              No artwork selected. Click any artwork to position it, or use controls to inspect the gallery.
            </p>
          )}
          {statusMessage && <p className="status-msg">{statusMessage}</p>}
          <p className="hud-hint">
            🖱️ <b>Middle-drag</b>: Orbit · <b>Right-drag</b>: Move artwork (or pan when unfocused) · <b>Left-click</b>: Select · <b>WASD</b>: Roam · <b>Esc</b>: Unfocus
          </p>
        </div>

        {/* Curator Keybindings & Controls Side Panel */}
        {showSettingsSidebar && (
          <StudioSettingsSidebar
            settings={settings}
            onUpdate={(newSettings) => setSettings(newSettings)}
            onClose={() => setShowSettingsSidebar(false)}
          />
        )}
      </div>
    </div>
  );
}
