/**
 * Task 7: Room GLB loader + Procedural Gallery Room Fallback
 *
 * Spec §5.2:
 *   - GLB loaded via SceneLoader.AppendAsync through media proxy URL or direct URL
 *   - Floor/ground meshes tagged checkCollisions=true + teleport targets
 *   - Solid 3D box walls with collision thickness & distinct aesthetic contrast
 *   - onProgress wired to loading bar (prevent "frozen" appearance)
 *   - Self-hosted decoders configured in engine.ts
 *   - Default platform rooms / procedural fallback for instant out-of-the-box gallery experience
 */
import type { Scene, AbstractMesh } from '@babylonjs/core';
import {
  SceneLoader,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { proxyMediaUrl } from '../media/gdrive';

export interface LoadProgress {
  total: number;
  loaded: number;
  fraction: number;
}

/**
 * Floor detection heuristic (spec §5.2):
 *   - Mesh name contains 'floor' or 'ground'
 *   - Fallback: largest horizontal mesh (normal mostly Y-up, large area)
 */
export function isFloorMesh(mesh: AbstractMesh, allMeshes: AbstractMesh[]): boolean {
  const name = mesh.name.toLowerCase();
  if (name.includes('floor') || name.includes('ground')) return true;

  // Fallback heuristic: largest mesh by bounding box X*Z area
  if (allMeshes.length <= 1) return false;

  const areas = allMeshes.map((m) => {
    const bb = m.getBoundingInfo().boundingBox;
    const extX = bb.maximumWorld.x - bb.minimumWorld.x;
    const extZ = bb.maximumWorld.z - bb.minimumWorld.z;
    return { mesh: m, area: extX * extZ };
  });

  const largest = areas.reduce((a, b) => (a.area > b.area ? a : b));
  return largest.mesh === mesh;
}

/**
 * Creates an architectural gallery room procedurally (walls, floor, ceiling, baseboards).
 * Used for default library rooms ('default-white-cube', 'default-grand-hall', 'default-minimal-studio')
 * and as an automatic graceful fallback if a custom GLB cannot be reached.
 */
export function createProceduralGalleryRoom(
  scene: Scene,
  variant: 'white-cube' | 'grand-hall' | 'minimal' = 'white-cube'
): AbstractMesh[] {
  // Dimensions
  const width = variant === 'grand-hall' ? 28 : variant === 'minimal' ? 16 : 22;
  const depth = variant === 'grand-hall' ? 20 : variant === 'minimal' ? 14 : 16;
  const height = variant === 'grand-hall' ? 5.5 : 4.2;
  const wallThick = 0.6; // Solid 60cm thick walls prevent any camera collision tunneling

  const halfW = width / 2;
  const halfD = depth / 2;
  const halfH = height / 2;

  // Register room bounds in scene metadata for dual-layer collision shield
  scene.metadata = {
    ...(scene.metadata ?? {}),
    roomBounds: {
      minX: -halfW + 0.6,
      maxX: halfW - 0.6,
      minZ: -halfD + 0.6,
      maxZ: halfD - 0.6,
    },
  };

  // Materials with high-contrast, premium museum aesthetics
  const floorMat = new StandardMaterial('proc_floor_mat', scene);
  if (variant === 'grand-hall') {
    floorMat.diffuseColor = new Color3(0.22, 0.16, 0.11); // Rich dark parquet wood
    floorMat.specularColor = new Color3(0.3, 0.3, 0.3);
  } else {
    floorMat.diffuseColor = new Color3(0.20, 0.19, 0.18); // Dark elegant hardwood / slate
    floorMat.specularColor = new Color3(0.25, 0.25, 0.25);
  }

  // Walls: Crisp museum off-white matte plaster finish (stands out strongly from dark floor)
  const wallMat = new StandardMaterial('proc_wall_mat', scene);
  wallMat.diffuseColor =
    variant === 'minimal'
      ? new Color3(0.96, 0.96, 0.95)
      : new Color3(0.92, 0.91, 0.88); // Warm gallery alabaster
  wallMat.specularColor = new Color3(0.04, 0.04, 0.04);

  // Ceiling: Architectural white
  const ceilingMat = new StandardMaterial('proc_ceiling_mat', scene);
  ceilingMat.diffuseColor = new Color3(0.90, 0.90, 0.92);

  // Baseboard trim: Deep charcoal contrast border
  const trimMat = new StandardMaterial('proc_trim_mat', scene);
  trimMat.diffuseColor = new Color3(0.09, 0.09, 0.11);

  // 1. Floor
  const floor = MeshBuilder.CreateGround(
    'gallery_floor',
    { width, height: depth, subdivisions: 2 },
    scene
  );
  floor.material = floorMat;
  floor.checkCollisions = true;
  floor.metadata = { isFloor: true };
  floor.receiveShadows = true;

  // 2. Ceiling
  const ceiling = MeshBuilder.CreateBox(
    'gallery_ceiling',
    { width: width + wallThick * 2, height: 0.3, depth: depth + wallThick * 2 },
    scene
  );
  ceiling.position = new Vector3(0, height + 0.15, 0);
  ceiling.material = ceilingMat;
  ceiling.checkCollisions = true;

  // 3. Solid 3D Walls (North, South, East, West with 0.6m depth)
  // North Wall (Z+)
  const northWall = MeshBuilder.CreateBox(
    'gallery_wall_north',
    { width: width + wallThick * 2, height, depth: wallThick },
    scene
  );
  northWall.position = new Vector3(0, halfH, halfD + wallThick / 2);
  northWall.material = wallMat;
  northWall.checkCollisions = true;

  // South Wall (Z-)
  const southWall = MeshBuilder.CreateBox(
    'gallery_wall_south',
    { width: width + wallThick * 2, height, depth: wallThick },
    scene
  );
  southWall.position = new Vector3(0, halfH, -halfD - wallThick / 2);
  southWall.material = wallMat;
  southWall.checkCollisions = true;

  // East Wall (X+)
  const eastWall = MeshBuilder.CreateBox(
    'gallery_wall_east',
    { width: wallThick, height, depth },
    scene
  );
  eastWall.position = new Vector3(halfW + wallThick / 2, halfH, 0);
  eastWall.material = wallMat;
  eastWall.checkCollisions = true;

  // West Wall (X-)
  const westWall = MeshBuilder.CreateBox(
    'gallery_wall_west',
    { width: wallThick, height, depth },
    scene
  );
  westWall.position = new Vector3(-halfW - wallThick / 2, halfH, 0);
  westWall.material = wallMat;
  westWall.checkCollisions = true;

  // 4. Baseboard Trims (Perimeter Skirting)
  const trimHeight = 0.14;
  const trimDepth = 0.05;

  const northTrim = MeshBuilder.CreateBox('trim_north', { width, height: trimHeight, depth: trimDepth }, scene);
  northTrim.position = new Vector3(0, trimHeight / 2, halfD - trimDepth / 2);
  northTrim.material = trimMat;

  const southTrim = MeshBuilder.CreateBox('trim_south', { width, height: trimHeight, depth: trimDepth }, scene);
  southTrim.position = new Vector3(0, trimHeight / 2, -halfD + trimDepth / 2);
  southTrim.material = trimMat;

  const eastTrim = MeshBuilder.CreateBox('trim_east', { width: trimDepth, height: trimHeight, depth }, scene);
  eastTrim.position = new Vector3(halfW - trimDepth / 2, trimHeight / 2, 0);
  eastTrim.material = trimMat;

  const westTrim = MeshBuilder.CreateBox('trim_west', { width: trimDepth, height: trimHeight, depth }, scene);
  westTrim.position = new Vector3(-halfW + trimDepth / 2, trimHeight / 2, 0);
  westTrim.material = trimMat;

  return [floor];
}

/**
 * Load a room GLB through the media proxy or direct URL.
 * Returns the array of floor meshes (for teleport raycasting).
 */
export async function loadGlbRoom(
  scene: Scene,
  glbFileId: string,
  onProgress: (p: LoadProgress) => void,
  version?: string | number
): Promise<AbstractMesh[]> {
  // Built-in procedural gallery room templates
  if (!glbFileId || glbFileId.startsWith('default-') || glbFileId === 'procedural') {
    onProgress({ total: 1, loaded: 1, fraction: 1 });
    const variant = glbFileId.includes('grand')
      ? 'grand-hall'
      : glbFileId.includes('minimal')
      ? 'minimal'
      : 'white-cube';
    return createProceduralGalleryRoom(scene, variant);
  }

  const loadUrl = proxyMediaUrl(glbFileId, version); // passthrough handles direct URLs

  try {
    const result = await SceneLoader.AppendAsync(
      '',
      loadUrl,
      scene,
      (event) => {
        const total = event.total || 1;
        onProgress({
          total,
          loaded: event.loaded,
          fraction: Math.min(event.loaded / total, 1),
        });
      },
      '.glb'
    );

    const loadedMeshes = result.meshes;
    const floorMeshes: AbstractMesh[] = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (const mesh of loadedMeshes) {
      if (mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
        mesh.checkCollisions = true;

        const bb = mesh.getBoundingInfo().boundingBox;
        minX = Math.min(minX, bb.minimumWorld.x);
        maxX = Math.max(maxX, bb.maximumWorld.x);
        minZ = Math.min(minZ, bb.minimumWorld.z);
        maxZ = Math.max(maxZ, bb.maximumWorld.z);
      }

      const floor = isFloorMesh(mesh, loadedMeshes);
      if (floor) {
        mesh.metadata = { ...(mesh.metadata ?? {}), isFloor: true };
        floorMeshes.push(mesh);
      }
    }

    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      scene.metadata = {
        ...(scene.metadata ?? {}),
        roomBounds: {
          minX: minX + 0.4,
          maxX: maxX - 0.4,
          minZ: minZ + 0.4,
          maxZ: maxZ - 0.4,
        },
      };
    }

    if (floorMeshes.length === 0) {
      // Ensure at least one ground collider exists
      const fallbackFloor = MeshBuilder.CreateGround('auto_floor', { width: 30, height: 30 }, scene);
      fallbackFloor.isVisible = false;
      fallbackFloor.checkCollisions = true;
      fallbackFloor.metadata = { isFloor: true };
      floorMeshes.push(fallbackFloor);
    }

    return floorMeshes;
  } catch (err) {
    console.warn(`[room-loader] Failed to load GLB model from ${loadUrl}, using procedural gallery room fallback:`, err);
    onProgress({ total: 1, loaded: 1, fraction: 1 });
    return createProceduralGalleryRoom(scene, 'white-cube');
  }
}
