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
import type { AbstractMesh, Scene, Mesh } from '@babylonjs/core';
import { GizmoManager, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import { deserializeTransform, serializeTransform } from '../../lib/studio/transform';
import { isArtworkPlaced } from '../../lib/studio/artwork-placement';
import {
  parseSpawnPoint,
  serializeSpawnPoint,
  type SpawnPoint,
} from '../../lib/studio/spawn-point';
import {
  createSpawnBeaconMesh,
  getSpawnPointFromBeacon,
  updateSpawnBeaconTransform,
  SPAWN_BEACON_NODE_NAME,
} from '../../lib/babylon/spawn-beacon';
import {
  StudioSettingsSidebar,
  getStoredStudioSettings,
  type StudioKeybindings,
} from './StudioSettingsSidebar';
import { Icon, Button } from '../ui';

interface GizmoPlacementProps {
  room: Room;
  artworks: Artwork[];
  exhibitionId?: string;
  settingsJson?: string | null;
  workbenchMode?: 'artworks' | 'waypoints' | 'walk';
  initialSelectedArtworkId?: string;
  embedded?: boolean;
  onSelectArtwork?(artworkId: string | null): void;
  onArtworkTransformSaved?(artworkId: string, newTransformJson: string): void;
  onSpawnPointSaved?(spawn: SpawnPoint): void;
  onClose(): void;
}

type GizmoMode = 'position' | 'rotation' | 'scale';

export function GizmoPlacement({
  room,
  artworks,
  exhibitionId,
  settingsJson,
  workbenchMode = 'artworks',
  initialSelectedArtworkId,
  embedded = false,
  onSelectArtwork,
  onArtworkTransformSaved,
  onSpawnPointSaved,
  onClose,
}: GizmoPlacementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workbenchModeRef = useRef(workbenchMode);
  workbenchModeRef.current = workbenchMode;
  const [settings, setSettings] = useState<StudioKeybindings>(getStoredStudioSettings());
  const settingsRef = useRef<StudioKeybindings>(settings);
  settingsRef.current = settings;

  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const lockAspectRatioRef = useRef(lockAspectRatio);
  lockAspectRatioRef.current = lockAspectRatio;
  const onSelectArtworkRef = useRef(onSelectArtwork);
  onSelectArtworkRef.current = onSelectArtwork;
  const onArtworkTransformSavedRef = useRef(onArtworkTransformSaved);
  onArtworkTransformSavedRef.current = onArtworkTransformSaved;

  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(
    initialSelectedArtworkId ?? null
  );
  const selectedArtworkIdRef = useRef<string | null>(selectedArtworkId);
  selectedArtworkIdRef.current = selectedArtworkId;

  const [sceneReady, setSceneReady] = useState(false);
  const initialFramedRef = useRef(false);
  const didRightDragArtworkRef = useRef(false);

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const meshesMapRef = useRef<Map<string, AbstractMesh>>(new Map());
  const spawnBeaconMeshRef = useRef<Mesh | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const rightDragStartRef = useRef<{ x: number; y: number } | null>(null);

  const settingsJsonRef = useRef(settingsJson);
  settingsJsonRef.current = settingsJson;
  const onSpawnPointSavedRef = useRef(onSpawnPointSaved);
  onSpawnPointSavedRef.current = onSpawnPointSaved;

  // Auto-persist spawn point to exhibition settings_json
  const persistSpawnPoint = useCallback(
    async (beaconMesh: Mesh) => {
      const spawn = getSpawnPointFromBeacon(beaconMesh);
      const updatedSettings = serializeSpawnPoint(spawn, settingsJsonRef.current);
      settingsJsonRef.current = updatedSettings;
      setStatusMessage(`Start Point saved: (${spawn.position[0]}, ${spawn.position[1]}, ${spawn.position[2]})`);

      if (exhibitionId) {
        try {
          await fetch(`/api/exhibitions/${exhibitionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ settings_json: updatedSettings }),
          });
          onSpawnPointSavedRef.current?.(spawn);
        } catch (err) {
          console.error('[studio-gizmo] Failed to save start point:', err);
        }
      }
    },
    [exhibitionId]
  );

  const persistSpawnPointRef = useRef(persistSpawnPoint);
  persistSpawnPointRef.current = persistSpawnPoint;

  // Auto-persist transform changes when curator finishes moving/scaling/rotating
  const persistTransform = useCallback(async (mesh: AbstractMesh, artId: string) => {
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

    const transform = {
      position: [
        Math.round(mesh.position.x * 1000) / 1000,
        Math.round(mesh.position.y * 1000) / 1000,
        Math.round(mesh.position.z * 1000) / 1000,
      ] as [number, number, number],
      rotation: [
        Math.round(rx * 1000) / 1000,
        Math.round(ry * 1000) / 1000,
        Math.round(rz * 1000) / 1000,
      ] as [number, number, number],
      scale: [
        Math.round(mesh.scaling.x * 1000) / 1000,
        Math.round(mesh.scaling.y * 1000) / 1000,
        Math.round(mesh.scaling.z * 1000) / 1000,
      ] as [number, number, number],
    };

    const transformJson = serializeTransform(transform);
    setTransformValues(transform);

    // Update in-memory snapshot so diffing knows it has already been synchronized
    const existingMesh = meshesMapRef.current.get(artId);
    if (existingMesh?.metadata?.artworkData) {
      existingMesh.metadata.artworkData.transform_json = transformJson;
    }

    try {
      const res = await fetch(`/api/artworks/${artId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transform_json: transformJson }),
      });
      if (res.ok) {
        onArtworkTransformSavedRef.current?.(artId, transformJson);
      }
    } catch (err) {
      console.error('[studio-gizmo] Failed to auto-save transform:', err);
    }
  }, []);

  const persistTransformRef = useRef(persistTransform);
  persistTransformRef.current = persistTransform;

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

  // Select / Attach to artwork mesh or spawn beacon
  const selectArtwork = useCallback(
    (id: string | null, notifyParent = true) => {
      setSelectedArtworkId(id);
      setStatusMessage(null);
      if (notifyParent) {
        onSelectArtworkRef.current?.(id === '__spawn_beacon__' ? null : id);
      }
      const gm = gizmoManagerRef.current;
      const camera = cameraRef.current;
      if (!gm) return;

      if (!id) {
        // Unfocus / Deselect
        gm.attachToMesh(null);
        return;
      }

      if (id === '__spawn_beacon__') {
        const beacon = spawnBeaconMeshRef.current;
        if (beacon) {
          gm.attachToMesh(beacon);
          updateCoordsFromMesh(beacon);
          if (camera) {
            camera.setTarget(beacon.position.clone());
          }
        }
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

  const selectArtworkRef = useRef(selectArtwork);
  selectArtworkRef.current = selectArtwork;

  // Place start point at current camera vantage point
  const placeSpawnAtCamera = useCallback(() => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    // Calculate forward facing direction
    const forward = camera.target.subtract(camera.position);
    forward.y = 0;
    const yaw = Math.atan2(forward.x, forward.z);

    const newSpawn: SpawnPoint = {
      position: [
        Math.round(camera.position.x * 100) / 100,
        Math.round(camera.position.y * 100) / 100,
        Math.round(camera.position.z * 100) / 100,
      ],
      rotation: [0, Math.round(yaw * 100) / 100, 0],
    };

    let beacon = spawnBeaconMeshRef.current;
    if (!beacon) {
      beacon = createSpawnBeaconMesh(scene, newSpawn);
      spawnBeaconMeshRef.current = beacon;
    } else {
      updateSpawnBeaconTransform(beacon, newSpawn);
    }

    persistSpawnPoint(beacon);
    selectArtwork('__spawn_beacon__');
  }, [persistSpawnPoint, selectArtwork]);

  useEffect(() => {
    const isWaypoints = workbenchMode === 'waypoints';
    if (spawnBeaconMeshRef.current) {
      spawnBeaconMeshRef.current.setEnabled(isWaypoints);
    }
    if (isWaypoints) {
      selectArtwork('__spawn_beacon__', false);
    } else if (workbenchMode === 'walk') {
      selectArtwork(null, false);
    } else if (workbenchMode === 'artworks' && selectedArtworkIdRef.current === '__spawn_beacon__') {
      selectArtwork(null, false);
    }
  }, [workbenchMode, selectArtwork]);

  useEffect(() => {
    const targetId = initialSelectedArtworkId ?? null;
    if (targetId !== selectedArtworkIdRef.current) {
      selectArtwork(targetId, false);
    }
  }, [initialSelectedArtworkId, selectArtwork]);

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
      try {
        const { initScene } = await import('../../lib/babylon/engine');
        const { loadGlbRoom } = await import('../../lib/babylon/room-loader');

        if (disposed || !canvasRef.current) return;

        sceneHandle = initScene(canvasRef.current);
        const { scene } = sceneHandle;
        sceneRef.current = scene;

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

      // Setup GizmoManager
      const gm = new GizmoManager(scene);
      gm.positionGizmoEnabled = true;
      gm.rotationGizmoEnabled = false;
      gm.scaleGizmoEnabled = false;
      gm.usePointerToAttachGizmos = false; // Handled explicitly
      gizmoManagerRef.current = gm;

      // Load Room
      try {
        await loadGlbRoom(scene, room.glb_file_id, () => {}, room.created_at);
      } catch (e) {
        console.error('[studio-gizmo] Failed to load room GLB:', e);
      }

      if (disposed) return;

      // Initialize 3D Spawn Beacon in scene
      const initialSpawn = parseSpawnPoint(settingsJsonRef.current, room.spawn_json) ?? {
        position: [0, 1.7, 0],
        target: [0, 1.7, 5],
      };
      const beaconMesh = createSpawnBeaconMesh(scene, initialSpawn);
      beaconMesh.setEnabled(workbenchModeRef.current === 'waypoints');
      spawnBeaconMeshRef.current = beaconMesh;

      setSceneReady(true);

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
          if (workbenchModeRef.current === 'walk') {
            return;
          }

          if (workbenchModeRef.current === 'waypoints') {
            if (pickInfo?.hit && pickInfo.pickedMesh) {
              let curr: AbstractMesh | null = pickInfo.pickedMesh;
              while (curr) {
                if (curr.name === SPAWN_BEACON_NODE_NAME || curr.metadata?.isSpawnBeacon) {
                  if (selectedArtworkIdRef.current !== '__spawn_beacon__') {
                    selectArtworkRef.current('__spawn_beacon__');
                  }
                  return;
                }
                curr = curr.parent as AbstractMesh | null;
              }
            }
            return;
          }

          // In Artworks mode: Left click selects artwork or unfocuses
          if (pickInfo?.hit && pickInfo.pickedMesh) {
            const artworkId = findArtworkId(pickInfo.pickedMesh);
            if (artworkId) {
              if (artworkId !== selectedArtworkIdRef.current) {
                selectArtworkRef.current(artworkId);
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
              meshName.includes('cylinder') ||
              meshName.includes('spawn');
            if (!isGizmo) {
              selectArtworkRef.current(null);
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
          if (activeId === '__spawn_beacon__' && spawnBeaconMeshRef.current && settingsRef.current.rightClickMode === 'move_artwork') {
            const mesh = spawnBeaconMeshRef.current;
            const dist = Vector3.Distance(camera.position, mesh.position);
            const sens = Math.max(0.8, dist) * 0.0018 * settingsRef.current.dragSensitivity;

            mesh.position.addInPlace(camRight.scale(dx * sens).add(camUp.scale(-dy * sens)));
            didRightDragArtworkRef.current = true;
            updateCoordsFromMesh(mesh);
          } else if (activeId && meshesMapRef.current.has(activeId) && settingsRef.current.rightClickMode === 'move_artwork') {
            // 1. Focused Artwork: Translate artwork along view plane (camera stays completely stationary)
            const mesh = meshesMapRef.current.get(activeId)!;
            const dist = Vector3.Distance(camera.position, mesh.position);
            const sens = Math.max(0.8, dist) * 0.0018 * settingsRef.current.dragSensitivity;

            mesh.position.addInPlace(camRight.scale(dx * sens).add(camUp.scale(-dy * sens)));
            didRightDragArtworkRef.current = true;
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
          if (didRightDragArtworkRef.current) {
            didRightDragArtworkRef.current = false;
            const activeId = selectedArtworkIdRef.current;
            if (activeId === '__spawn_beacon__' && spawnBeaconMeshRef.current) {
              persistSpawnPointRef.current(spawnBeaconMeshRef.current);
            } else if (activeId && meshesMapRef.current.has(activeId)) {
              persistTransformRef.current(meshesMapRef.current.get(activeId)!, activeId);
            }
          }
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
      } catch (err) {
        // WebGL unsupported or context creation failed
        console.warn('Failed to initialize 3D authoring scene:', err);
      }
    })();

    // Keyboard event listeners for WASD navigation & Esc unfocus
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Escape') {
        selectArtworkRef.current(null);
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
      didRightDragArtworkRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      disposed = true;
      setSceneReady(false);
      sceneRef.current = null;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      for (const mesh of Array.from(meshesMapRef.current.values())) {
        mesh.dispose(false, true);
      }
      meshesMapRef.current.clear();
      gizmoManagerRef.current?.dispose();
      sceneHandle?.dispose();
    };
  }, [room.glb_file_id, room.created_at]);

  // Synchronize artwork meshes dynamically when artworks prop updates (single source of truth for meshes)
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    const scene = sceneRef.current;

    let disposed = false;
    (async () => {
      const { createArtworkMesh } = await import('../../lib/babylon/artwork-factory');
      if (disposed || !sceneRef.current) return;

      // Active IDs only include artworks that are placed in the room
      const activePlacedArtworks = artworks.filter((a) => isArtworkPlaced(a));
      const activeIds = new Set(activePlacedArtworks.map((a) => a.id));

      // Remove deleted or unplaced (storage) meshes
      for (const [id, mesh] of Array.from(meshesMapRef.current.entries())) {
        if (!activeIds.has(id)) {
          if (selectedArtworkIdRef.current === id) {
            gizmoManagerRef.current?.attachToMesh(null);
          }
          scene.getLightByName(`${id}_spot`)?.dispose();
          mesh.dispose(false, true);
          meshesMapRef.current.delete(id);
        }
      }

      // Diff and update modified or new placed meshes
      for (const art of activePlacedArtworks) {
        const existingMesh = meshesMapRef.current.get(art.id);
        const prevData = existingMesh?.metadata?.artworkData as Artwork | undefined;

        const isDifferent =
          !existingMesh ||
          !prevData ||
          prevData.frame_config_json !== art.frame_config_json ||
          prevData.media_file_id !== art.media_file_id ||
          prevData.youtube_video_id !== art.youtube_video_id ||
          prevData.artwork_type !== art.artwork_type ||
          prevData.title !== art.title ||
          prevData.artist !== art.artist ||
          prevData.medium !== art.medium ||
          prevData.transform_json !== art.transform_json ||
          prevData.updated_at !== art.updated_at;

        if (isDifferent) {
          const onlyTransformChanged =
            existingMesh &&
            prevData &&
            prevData.frame_config_json === art.frame_config_json &&
            prevData.media_file_id === art.media_file_id &&
            prevData.youtube_video_id === art.youtube_video_id &&
            prevData.artwork_type === art.artwork_type &&
            prevData.title === art.title &&
            prevData.artist === art.artist &&
            prevData.medium === art.medium;

          if (onlyTransformChanged && existingMesh) {
            // Apply updated transform directly to existing mesh without recreating geometry
            const t = deserializeTransform(art.transform_json);
            existingMesh.position.set(t.position[0], t.position[1], t.position[2]);
            existingMesh.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
            existingMesh.scaling.set(t.scale[0], t.scale[1], t.scale[2]);
            if (!existingMesh.metadata) existingMesh.metadata = {};
            existingMesh.metadata.artworkData = art;
            if (selectedArtworkIdRef.current === art.id) {
              updateCoordsFromMesh(existingMesh);
            }
            continue;
          }

          const wasSelected = selectedArtworkIdRef.current === art.id;
          if (existingMesh) {
            if (wasSelected) {
              gizmoManagerRef.current?.attachToMesh(null);
            }
            scene.getLightByName(`${art.id}_spot`)?.dispose();
            existingMesh.dispose(false, true);
            meshesMapRef.current.delete(art.id);
          }

          const newMesh = createArtworkMesh(scene, art);
          if (newMesh) {
            if (!newMesh.metadata) newMesh.metadata = {};
            newMesh.metadata.artworkData = art;
            meshesMapRef.current.set(art.id, newMesh);

            if (wasSelected && gizmoManagerRef.current) {
              gizmoManagerRef.current.attachToMesh(newMesh);
              updateCoordsFromMesh(newMesh);
            }
          }
        }
      }

      // Initial framing on selected artwork if not already framed
      if (!initialFramedRef.current) {
        const initialId = selectedArtworkIdRef.current;
        if (initialId && meshesMapRef.current.has(initialId)) {
          const targetMesh = meshesMapRef.current.get(initialId)!;
          if (gizmoManagerRef.current) {
            gizmoManagerRef.current.attachToMesh(targetMesh);
          }
          if (cameraRef.current) {
            cameraRef.current.setTarget(targetMesh.position.clone());
          }
          updateCoordsFromMesh(targetMesh);
          initialFramedRef.current = true;
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [artworks, sceneReady, updateCoordsFromMesh]);

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

    const onDragEnd = () => {
      if (gm.attachedMesh && selectedArtworkIdRef.current) {
        updateCoordsFromMesh(gm.attachedMesh);
        if (selectedArtworkIdRef.current === '__spawn_beacon__' && spawnBeaconMeshRef.current) {
          persistSpawnPointRef.current(spawnBeaconMeshRef.current);
        } else {
          persistTransformRef.current(gm.attachedMesh, selectedArtworkIdRef.current);
        }
      }
    };

    // Position Gizmo
    if (gm.gizmos.positionGizmo) {
      gm.gizmos.positionGizmo.scaleRatio = 1.2;
      gm.gizmos.positionGizmo.onDragObservable.clear();
      gm.gizmos.positionGizmo.onDragEndObservable.clear();
      gm.gizmos.positionGizmo.onDragObservable.add(onPositionDrag);
      gm.gizmos.positionGizmo.onDragEndObservable.add(onDragEnd);
    }

    // Rotation Gizmo
    if (gm.gizmos.rotationGizmo) {
      gm.gizmos.rotationGizmo.scaleRatio = 1.3;
      gm.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
      gm.gizmos.rotationGizmo.onDragObservable.clear();
      gm.gizmos.rotationGizmo.onDragEndObservable.clear();
      gm.gizmos.rotationGizmo.onDragObservable.add(onPositionDrag);
      gm.gizmos.rotationGizmo.onDragEndObservable.add(onDragEnd);
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
        if (gm.attachedMesh && selectedArtworkIdRef.current) {
          updateCoordsFromMesh(gm.attachedMesh);
          persistTransformRef.current(gm.attachedMesh, selectedArtworkIdRef.current);
        }
      });
    }
  }, [gizmoMode, updateCoordsFromMesh]);

  const selectedArt = artworks.find((a) => a.id === selectedArtworkId);

  return (
    <div className={embedded ? 'gizmo-embedded' : 'gizmo-placement-overlay'}>
      <div className="gizmo-toolbar">
        <div className="toolbar-left">
          {!embedded && (
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <Icon name="chevronLeft" size={13} /> Back to Artworks
            </Button>
          )}
          <span className="room-badge">Room: {room.name}</span>
        </div>

        <div className="toolbar-center">
          {workbenchMode === 'walk' ? (
            <span className="nav-mode-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="play" /> Walkthrough View · WASD to walk, Mouse to look around (visitor gravity active)
            </span>
          ) : workbenchMode === 'waypoints' || selectedArtworkId === '__spawn_beacon__' ? (
            <>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'position' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('position')}
                  title="Move Start Position"
                >
                  <Icon name="select" /> Move Position
                </button>
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'rotation' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('rotation')}
                  title="Rotate Start Facing Direction"
                >
                  <Icon name="cube" /> Rotate Facing
                </button>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconLeft="pin"
                onClick={placeSpawnAtCamera}
                title="Drop start vantage point directly at current camera position"
              >
                Set at Camera
              </Button>
            </>
          ) : selectedArtworkId ? (
            <>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'position' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('position')}
                  title="Position Translation Gizmo"
                >
                  <Icon name="select" /> Move
                </button>
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'rotation' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('rotation')}
                  title="Rotation Gizmo"
                >
                  <Icon name="cube" /> Rotate
                </button>
                <button
                  type="button"
                  className={`mode-btn ${gizmoMode === 'scale' ? 'active' : ''}`}
                  onClick={() => setGizmoMode('scale')}
                  title="Scale Gizmo"
                >
                  <Icon name="fullscreen" /> Scale
                </button>
              </div>

              {gizmoMode === 'scale' && (
                <Button
                  type="button"
                  variant={lockAspectRatio ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setLockAspectRatio((prev) => !prev)}
                  title={lockAspectRatio ? 'Locked: Aspect ratio is preserved proportionally' : 'Unlocked: Free independent axis scaling'}
                >
                  {lockAspectRatio ? 'Lock Ratio' : 'Free Scale'}
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                iconLeft="inspect"
                onClick={frameSelectedArtwork}
                title="Center camera on selected artwork"
              >
                Frame Artwork
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => selectArtwork(null)}
                title="Unfocus / Deselect (Esc)"
              >
                <Icon name="close" size={14} /> Unfocus
              </Button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="nav-mode-indicator" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="cube" /> Artworks Mode · Click any artwork on the wall to position, scale, or rotate
              </span>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          <Button
            type="button"
            variant={showSettingsSidebar ? 'primary' : 'secondary'}
            size="sm"
            iconLeft="gear"
            onClick={() => setShowSettingsSidebar((prev) => !prev)}
            title="Configure Keybindings & Controls"
          >
            Controls &amp; Keys
          </Button>
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
          <h4>
            {workbenchMode === 'walk'
              ? 'Visitor Walkthrough Mode'
              : workbenchMode === 'waypoints' || selectedArtworkId === '__spawn_beacon__'
              ? 'Gallery Start Point & Waypoint'
              : selectedArt
              ? `Selected: ${selectedArt.title}`
              : 'Artworks Placement Mode'}
          </h4>
          {workbenchMode === 'walk' ? (
            <p className="hud-unfocused">
              Experiencing gallery from visitor eye-level with natural floor gravity and collisions. Use <b>WASD</b> or Arrow keys to walk, mouse to look.
            </p>
          ) : workbenchMode === 'waypoints' || selectedArtworkId === '__spawn_beacon__' ? (
            <div className="hud-values">
              <span>
                Start Pos: [{transformValues.position[0]}, {transformValues.position[1]},{' '}
                {transformValues.position[2]}]
              </span>
              <span>
                Facing: [{transformValues.rotation[0]}, {transformValues.rotation[1]},{' '}
                {transformValues.rotation[2]}]
              </span>
            </div>
          ) : selectedArt ? (
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
              Click any artwork on the wall to position, scale, or rotate it. Switch to <b>Waypoints</b> above to adjust visitor start point.
            </p>
          )}
          {statusMessage && <p className="status-msg">{statusMessage}</p>}
          <p className="hud-hint">
            <b>Middle-drag</b>: Orbit · <b>Right-drag</b>: Move object (or pan when unfocused) · <b>Left-click</b>: Select · <b>WASD</b>: Roam · <b>Esc</b>: Unfocus
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
