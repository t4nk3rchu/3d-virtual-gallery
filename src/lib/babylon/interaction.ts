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
  /** Ask the render-on-demand loop to draw a frame (e.g. after a resolution-tier swap). */
  requestRender?(): void;
}

export interface InteractionController {
  getState(): ViewerState;
  leaveInspect(onRestoreRoam?: () => void): void;
  leaveFocus(onRestoreRoam?: () => void): void;
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
    // A transition swaps the resolution tier; force a repaint even if the camera is idle.
    handlers.requestRender?.();
  }

  function handleLeave() {
    setState('ROAM');
    cameraController.clearFocus();
    scaler.setTier('WALK');
    updateHover(null, null);
  }

  function leaveInspect(onRestoreRoam?: () => void) {
    scaler.setTier('FOCUS');
    setState('FOCUS');
    updateHover(null, null);
    // Return to focus UI; the caller handles restoring FPS once back in ROAM
    onRestoreRoam?.();
  }

  function leaveFocus(onRestoreRoam?: () => void) {
    handleLeave();
    onRestoreRoam?.();
  }

  function focusArtwork(artworkId: string, mesh: AbstractMesh) {
    cameraController.focusOnArtwork(mesh);
    scaler.setTier('FOCUS');
    setState('FOCUS');
    updateHover(null, null);
    handlers.onArtworkFocus(artworkId, mesh);
  }

  function inspectArtwork(artworkId: string) {
    scaler.setTier('POPUP');
    setState('INSPECT');
    updateHover(null, null);
    // Release pointer lock so cursor is free inside the inspect lightbox
    if (cameraController.isPointerLocked) {
      cameraController.exitPointerLock();
    }
    handlers.onArtworkInspect(artworkId);
  }

  // ── Hover Tracking (deduplicated to prevent excess re-renders) ─────────
  let lastHoveredId: string | null = null;
  let lastHoverPos = { x: -999, y: -999 };

  function updateHover(artId: string | null, pos: { x: number; y: number } | null) {
    if (!artId || !pos) {
      if (lastHoveredId !== null) {
        lastHoveredId = null;
        lastHoverPos = { x: -999, y: -999 };
        handlers.onArtworkHover?.(null, null);
      }
      return;
    }

    const idChanged = artId !== lastHoveredId;
    const posChanged = Math.hypot(pos.x - lastHoverPos.x, pos.y - lastHoverPos.y) > 3;
    if (idChanged || posChanged) {
      lastHoveredId = artId;
      lastHoverPos = pos;
      handlers.onArtworkHover?.(artId, pos);
    }
  }

  // ── FPS Center Crosshair Hover Tracking ────────────────────────────────
  const renderObserver = scene.onBeforeRenderObservable?.add(() => {
    if (state !== 'ROAM') return;
    if (cameraController.isPointerLocked) {
      const pick = cameraController.pickFromCenter?.((m) => Boolean(m.metadata?.artworkId));
      const hoveredArtId: string | undefined = pick?.hit ? pick.pickedMesh?.metadata?.artworkId : undefined;
      if (hoveredArtId) {
        const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
        const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
        updateHover(hoveredArtId, { x: cx, y: cy });
      } else {
        updateHover(null, null);
      }
    }
  });

  const observer = scene.onPointerObservable.add((pointerInfo) => {
    // ── Hover tracking in ROAM mode (standard cursor) ─────────────────────
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      if (state === 'ROAM' && !cameraController.isPointerLocked) {
        const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => Boolean(m.metadata?.artworkId));
        const hoveredArtId: string | undefined = pick?.hit ? pick.pickedMesh?.metadata?.artworkId : undefined;
        if (hoveredArtId) {
          const clientX = pointerInfo.event.clientX ?? scene.pointerX;
          const clientY = pointerInfo.event.clientY ?? scene.pointerY;
          updateHover(hoveredArtId, { x: clientX, y: clientY });
        } else {
          updateHover(null, null);
        }
      } else if (!cameraController.isPointerLocked) {
        updateHover(null, null);
      }
      return;
    }

    if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;

    // In FPS mode with pointer locked, clicks are picked from the center reticle
    const isLocked = cameraController.isPointerLocked;
    const hit = isLocked
      ? cameraController.pickFromCenter?.()
      : pointerInfo.pickInfo;

    if (!hit?.hit || !hit.pickedMesh) return;

    const mesh = hit.pickedMesh;

    // ── Click on artwork mesh ─────────────────────────────────────────────
    const artworkId: string | undefined = mesh.metadata?.artworkId;
    if (artworkId) {
      if (state === 'ROAM') {
        // Roam → Focus
        // In FPS mode, exit pointer lock so user can interact with focus UI
        if (isLocked) {
          cameraController.exitPointerLock();
        }
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
      if (renderObserver && scene.onBeforeRenderObservable) {
        scene.onBeforeRenderObservable.remove(renderObserver);
      }
    },
  };
}
