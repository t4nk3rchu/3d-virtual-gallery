/**
 * 3D Start Point / Spawn Beacon mesh helper for Curator Editor mode.
 * Creates an elegant golden beacon disk on the floor, an eye-level head marker,
 * and a forward direction arrow indicating the visitor's initial vantage point.
 */
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from '@babylonjs/core';
import type { SpawnPoint } from '../studio/spawn-point';

export const SPAWN_BEACON_NODE_NAME = '__spawn_beacon_root__';

/**
 * Creates or updates the interactive 3D Spawn Beacon in the scene.
 */
export function createSpawnBeaconMesh(scene: Scene, spawnPoint: SpawnPoint): Mesh {
  // Check if already exists in scene
  const existing = scene.getMeshByName(SPAWN_BEACON_NODE_NAME);
  if (existing && existing instanceof Mesh) {
    updateSpawnBeaconTransform(existing, spawnPoint);
    return existing;
  }

  // Root anchor mesh for gizmo manipulation
  const root = MeshBuilder.CreateBox(
    SPAWN_BEACON_NODE_NAME,
    { width: 0.8, height: 1.7, depth: 0.8 },
    scene
  );
  root.isVisible = false; // invisible bounding box for easy selection and gizmo bounds
  root.position = new Vector3(
    spawnPoint.position[0],
    spawnPoint.position[1] - 0.85, // align base with floor
    spawnPoint.position[2]
  );
  if (spawnPoint.rotation) {
    root.rotation = new Vector3(
      spawnPoint.rotation[0],
      spawnPoint.rotation[1],
      spawnPoint.rotation[2]
    );
  }

  root.metadata = {
    isSpawnBeacon: true,
  };

  // 1. Gold Floor Ring
  const floorRing = MeshBuilder.CreateTorus(
    'spawn_floor_ring',
    { diameter: 1.0, thickness: 0.04, tessellation: 32 },
    scene
  );
  floorRing.parent = root;
  floorRing.position.y = -0.83; // on floor level relative to root center

  const goldMat = new StandardMaterial('spawn_gold_mat', scene);
  goldMat.diffuseColor = new Color3(0.85, 0.70, 0.35);
  goldMat.emissiveColor = new Color3(0.40, 0.30, 0.10);
  goldMat.specularColor = new Color3(1, 0.9, 0.6);
  floorRing.material = goldMat;

  // 2. Floor Disc with Compass Glyph
  const floorDisc = MeshBuilder.CreateDisc(
    'spawn_floor_disc',
    { radius: 0.45, tessellation: 32 },
    scene
  );
  floorDisc.parent = root;
  floorDisc.position.y = -0.84;
  floorDisc.rotation.x = Math.PI / 2;

  const discMat = new StandardMaterial('spawn_disc_mat', scene);
  discMat.diffuseColor = new Color3(0.2, 0.16, 0.1);
  discMat.emissiveColor = new Color3(0.15, 0.12, 0.05);
  floorDisc.material = discMat;

  // 3. Directional Forward Arrow (points forward +Z in local space)
  const arrowStem = MeshBuilder.CreateCylinder(
    'spawn_arrow_stem',
    { height: 0.4, diameter: 0.04 },
    scene
  );
  arrowStem.parent = root;
  arrowStem.position.y = -0.83;
  arrowStem.position.z = 0.3;
  arrowStem.rotation.x = Math.PI / 2;
  arrowStem.material = goldMat;

  const arrowHead = MeshBuilder.CreateCylinder(
    'spawn_arrow_head',
    { height: 0.2, diameterTop: 0, diameterBottom: 0.15, tessellation: 16 },
    scene
  );
  arrowHead.parent = root;
  arrowHead.position.y = -0.83;
  arrowHead.position.z = 0.55;
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.material = goldMat;

  // 4. Holographic Eye-Level Vantage Marker (1.7m visitor eye height)
  const eyeMarker = MeshBuilder.CreatePolyhedron(
    'spawn_eye_marker',
    { type: 1, size: 0.12 }, // Octahedron / Diamond
    scene
  );
  eyeMarker.parent = root;
  eyeMarker.position.y = 0.85; // at top of 1.7m bounding box (eye level)

  const eyeMat = new StandardMaterial('spawn_eye_mat', scene);
  eyeMat.diffuseColor = new Color3(1, 0.84, 0);
  eyeMat.emissiveColor = new Color3(0.6, 0.45, 0.15);
  eyeMarker.material = eyeMat;

  // 5. Vertical light tether
  const tether = MeshBuilder.CreateCylinder(
    'spawn_tether',
    { height: 1.68, diameter: 0.01 },
    scene
  );
  tether.parent = root;
  tether.position.y = 0;
  tether.material = eyeMat;

  return root;
}

/**
 * Updates the 3D Spawn Beacon position and rotation from a SpawnPoint.
 */
export function updateSpawnBeaconTransform(mesh: Mesh, spawnPoint: SpawnPoint): void {
  mesh.position.x = spawnPoint.position[0];
  mesh.position.y = spawnPoint.position[1] - 0.85;
  mesh.position.z = spawnPoint.position[2];

  if (spawnPoint.rotation) {
    mesh.rotation.x = spawnPoint.rotation[0];
    mesh.rotation.y = spawnPoint.rotation[1];
    mesh.rotation.z = spawnPoint.rotation[2];
  }
}

/**
 * Extracts a SpawnPoint object from the current transform of the Spawn Beacon mesh.
 */
export function getSpawnPointFromBeacon(mesh: Mesh): SpawnPoint {
  const yaw = mesh.rotation.y;
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);

  const eyeY = mesh.position.y + 0.85;

  return {
    position: [
      Math.round(mesh.position.x * 100) / 100,
      Math.round(eyeY * 100) / 100,
      Math.round(mesh.position.z * 100) / 100,
    ],
    rotation: [
      Math.round(mesh.rotation.x * 100) / 100,
      Math.round(mesh.rotation.y * 100) / 100,
      Math.round(mesh.rotation.z * 100) / 100,
    ],
    target: [
      Math.round((mesh.position.x + forwardX * 5) * 100) / 100,
      Math.round(eyeY * 100) / 100,
      Math.round((mesh.position.z + forwardZ * 5) * 100) / 100,
    ],
  };
}
