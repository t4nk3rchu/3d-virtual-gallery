/**
 * Task 7: Frame builder — procedural frame geometry math
 *
 * calculateFrameDimensions is pure math, independently testable.
 * createProceduralFrame creates the actual Babylon mesh (tested via integration).
 *
 * Spec §6.3: frame_config_json has frameType, frameWidth, matWidth, matColor, showPlacard
 */
import type { Scene, AbstractMesh } from '@babylonjs/core';
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import type { FrameConfig } from '../../types/schema';

export interface FrameDimensions {
  /** Total outer width (artwork + mat + frame on each side) */
  outerWidth: number;
  /** Total outer height */
  outerHeight: number;
  /** Artwork opening width */
  innerWidth: number;
  /** Artwork opening height */
  innerHeight: number;
}

/**
 * Pure math: calculate frame dimensions given artwork size and frame config.
 * No Babylon dependency — tested in isolation.
 */
export function calculateFrameDimensions(
  artworkWidth: number,
  artworkHeight: number,
  config: Pick<FrameConfig, 'frameWidth' | 'matWidth'>
): FrameDimensions {
  const totalBorder = config.matWidth + config.frameWidth;
  return {
    outerWidth: artworkWidth + totalBorder * 2,
    outerHeight: artworkHeight + totalBorder * 2,
    innerWidth: artworkWidth,
    innerHeight: artworkHeight,
  };
}

/**
 * Create a thin frame mesh around an artwork plane.
 * The frame is composed of 4 border strips, parented to the artwork plane.
 */
export function createProceduralFrame(
  scene: Scene,
  dims: FrameDimensions,
  config: FrameConfig,
  parentMesh: AbstractMesh
): AbstractMesh[] {
  if (config.frameType === 'none' || !config.frameWidth || config.frameWidth <= 0.001) {
    return [];
  }

  const parentName = parentMesh.name || 'artwork';
  const frameColor =
    config.frameType === 'metal_black'
      ? Color3.Black()
      : config.frameType === 'float_white'
      ? Color3.White()
      : config.frameType === 'gold'
      ? new Color3(0.85, 0.65, 0.13)
      : new Color3(0.55, 0.35, 0.15); // wood brown

  const mat = new StandardMaterial(`${parentName}_frame_mat`, scene);
  mat.diffuseColor = frameColor;
  mat.specularColor = config.frameType === 'metal_black'
    ? new Color3(0.5, 0.5, 0.5)
    : config.frameType === 'gold'
    ? new Color3(0.9, 0.8, 0.3)
    : new Color3(0.1, 0.1, 0.1);

  const depth = 0.02; // frame extrusion depth in metres
  const fw = config.frameWidth;

  // Top strip
  const top = MeshBuilder.CreateBox(
    `${parentName}_frame_top`,
    { width: dims.outerWidth, height: fw, depth },
    scene
  );
  top.parent = parentMesh;
  top.position.x = 0;
  top.position.y = dims.outerHeight / 2 - fw / 2;
  top.position.z = -depth / 2;
  top.material = mat;

  // Bottom strip
  const bottom = MeshBuilder.CreateBox(
    `${parentName}_frame_bottom`,
    { width: dims.outerWidth, height: fw, depth },
    scene
  );
  bottom.parent = parentMesh;
  bottom.position.x = 0;
  bottom.position.y = -(dims.outerHeight / 2 - fw / 2);
  bottom.position.z = -depth / 2;
  bottom.material = mat;

  // Left strip — height must span the area between top and bottom strips
  const left = MeshBuilder.CreateBox(
    `${parentName}_frame_left`,
    { width: fw, height: dims.outerHeight - 2 * fw, depth },
    scene
  );
  left.parent = parentMesh;
  left.position.x = -(dims.outerWidth / 2 - fw / 2);
  left.position.y = 0;
  left.position.z = -depth / 2;
  left.material = mat;

  // Right strip — height must span the area between top and bottom strips
  const right = MeshBuilder.CreateBox(
    `${parentName}_frame_right`,
    { width: fw, height: dims.outerHeight - 2 * fw, depth },
    scene
  );
  right.parent = parentMesh;
  right.position.x = dims.outerWidth / 2 - fw / 2;
  right.position.y = 0;
  right.position.z = -depth / 2;
  right.material = mat;

  // Prevent frame strips from blocking artwork raycasts
  const strips = [top, bottom, left, right];
  strips.forEach((m) => {
    m.isPickable = false;
  });

  return strips;
}
