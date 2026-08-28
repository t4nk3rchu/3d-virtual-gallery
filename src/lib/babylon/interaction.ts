/**
 * Task 8: Interaction wiring — Roam → Focus → Inspect
 *
 * Gap fix from v1: NO pointer picking was registered, so click-to-focus
 * and click-to-inspect could never fire.
 *
 * This module sets up scene.onPointerObservable to:
 *   - Resolve clicks to artwork meshes via mesh.metadata.artworkId
 *   - Resolve clicks to floor meshes for teleport
 *   - Call scaler.setTier() at every state transition (the other v1 gap)
 *
 * Spec §5.1 interaction table:
 *   Roam   → click floor    → teleportTo + WALK tier
 *   Roam   → click artwork  → focusOnArtwork + FOCUS tier + info panel open
 *   Focus  → click artwork  → Inspect lightbox + POPUP tier
 *   Inspect/Focus → close   → back to WALK
 */
import type { Scene, AbstractMesh } from '@babylonjs/core';
import { PointerEventTypes } from '@babylonjs/core';
import type { CameraController } from './camera-controller';
import type { ResolutionScaler } from './resolution-scaler';

export type ViewerState = 'ROAM' | 'FOCUS' | 'INSPECT';

export interface InteractionHandlers {
  onArtworkFocus(artworkId: string, mesh: AbstractMesh): void;
  onArtworkInspect(artworkId: string): void;
  onArtworkHover?(artworkId: string | null, screenPos: { x: number; y: number } | null): void;
  onStateChange(state: ViewerState): void;
}

export interface InteractionController {
  getState(): ViewerState;
  leaveInspect(): void;
  leaveFocus(): void;
  reset(): void;
  focusArtwork(artworkId: string, mesh: AbstractMesh): void;
  inspectArtwork(artworkId: string): void;
  dispose(): void;
}

export function wireInteraction(
  scene: Scene,
  cameraController: CameraController,
  scaler: ResolutionScaler,
  handlers: InteractionHandlers
): InteractionController {
  let state: ViewerState = 'ROAM';

  function setState(next: ViewerState) {
    if (state === next) return;
    state = next;
    handlers.onStateChange(next);
  }

  function handleLeave() {
    setState('ROAM');
    cameraController.clearFocus();
    scaler.setTier('WALK');
    handlers.onArtworkHover?.(null, null);
  }

  function leaveInspect() {
    scaler.setTier('FOCUS');
    setState('FOCUS');
    handlers.onArtworkHover?.(null, null);
  }

  function leaveFocus() {
    handleLeave();
  }

  function focusArtwork(artworkId: string, mesh: AbstractMesh) {
    cameraController.focusOnArtwork(mesh);
    scaler.setTier('FOCUS');
    setState('FOCUS');
    handlers.onArtworkHover?.(null, null);
    handlers.onArtworkFocus(artworkId, mesh);
  }

  function inspectArtwork(artworkId: string) {
    scaler.setTier('POPUP');
    setState('INSPECT');
    handlers.onArtworkHover?.(null, null);
    handlers.onArtworkInspect(artworkId);
  }

  const observer = scene.onPointerObservable.add((pointerInfo) => {
    // ── Hover tracking in ROAM mode ───────────────────────────────────────
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      if (state === 'ROAM') {
        const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => Boolean(m.metadata?.artworkId));
        const hoveredArtId: string | undefined = pick?.hit ? pick.pickedMesh?.metadata?.artworkId : undefined;
        if (hoveredArtId) {
          const clientX = pointerInfo.event.clientX ?? scene.pointerX;
          const clientY = pointerInfo.event.clientY ?? scene.pointerY;
          handlers.onArtworkHover?.(hoveredArtId, { x: clientX, y: clientY });
        } else {
          handlers.onArtworkHover?.(null, null);
        }
      } else {
        handlers.onArtworkHover?.(null, null);
      }
      return;
    }

    if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;
    const hit = pointerInfo.pickInfo;
    if (!hit?.hit || !hit.pickedMesh) return;

    const mesh = hit.pickedMesh;

    // ── Click on artwork mesh ─────────────────────────────────────────────
    const artworkId: string | undefined = mesh.metadata?.artworkId;
    if (artworkId) {
      if (state === 'ROAM') {
        // Roam → Focus
        focusArtwork(artworkId, mesh);
      } else if (state === 'FOCUS') {
        if (cameraController.focusedMesh === mesh) {
          // Focus → Inspect (click the same artwork again)
          inspectArtwork(artworkId);
        } else {
          // Click different artwork → switch Focus to it
          focusArtwork(artworkId, mesh);
        }
      }
      return;
    }

    // ── Click on floor mesh → teleport ────────────────────────────────────
    const isFloor: boolean =
      mesh.metadata?.isFloor === true ||
      mesh.name.toLowerCase().includes('floor') ||
      mesh.name.toLowerCase().includes('ground');

    if (isFloor && hit.pickedPoint) {
      cameraController.teleportTo(hit.pickedPoint.x, hit.pickedPoint.z);
      if (state === 'FOCUS' || state === 'INSPECT') {
        handleLeave();
      } else {
        scaler.setTier('WALK');
      }
    }
  });

  return {
    getState: () => state,
    leaveInspect,
    leaveFocus,
    reset: handleLeave,
    focusArtwork,
    inspectArtwork,
    dispose: () => {
      scene.onPointerObservable.remove(observer);
    },
  };
}
