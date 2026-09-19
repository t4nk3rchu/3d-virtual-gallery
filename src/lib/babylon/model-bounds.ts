import { Vector3, type AbstractMesh } from '@babylonjs/core';

/** World-space center + diagonal size of a model hierarchy (recomputes the world matrix). */
export function getModelBounds(root: AbstractMesh): { center: Vector3; size: number } {
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  return { center: min.add(max).scale(0.5), size: max.subtract(min).length() };
}
