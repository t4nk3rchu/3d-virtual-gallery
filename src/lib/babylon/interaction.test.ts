import { describe, it, expect, vi } from 'vitest';
import { wireInteraction } from './interaction';
import { ResolutionScaler } from './resolution-scaler';
import type { Scene, AbstractMesh } from '@babylonjs/core';
import type { CameraController } from './camera-controller';

describe('Interaction State Machine & Resolution Scaler', () => {
  it('resets scaler tier to WALK and clears camera focus on leaveFocus/reset', () => {
    const fakeEngine = { setHardwareScalingLevel: vi.fn() };
    const scaler = new ResolutionScaler(fakeEngine);

    const fakeCamera = {
      focusedMesh: null as AbstractMesh | null,
      focusOnArtwork: vi.fn(),
      clearFocus: vi.fn(),
      teleportTo: vi.fn(),
    } as unknown as CameraController;

    const fakeScene = {
      onPointerObservable: {
        add: vi.fn(() => ({})),
        remove: vi.fn(),
      },
    } as unknown as Scene;

    const onStateChange = vi.fn();
    const controller = wireInteraction(fakeScene, fakeCamera, scaler, {
      onArtworkFocus: vi.fn(),
      onArtworkInspect: vi.fn(),
      onStateChange,
    });

    expect(controller.getState()).toBe('ROAM');

    // Simulate entering inspect
    controller.inspectArtwork('art1');
    expect(controller.getState()).toBe('INSPECT');
    expect(scaler.currentTier).toBe('POPUP');

    // Lightbox close -> leaveInspect() -> resets to FOCUS
    controller.leaveInspect();
    expect(controller.getState()).toBe('FOCUS');
    expect(scaler.currentTier).toBe('FOCUS');

    // Focus panel close -> leaveFocus() -> resets to ROAM and WALK tier
    controller.leaveFocus();
    expect(controller.getState()).toBe('ROAM');
    expect(scaler.currentTier).toBe('WALK');
    expect(fakeCamera.clearFocus).toHaveBeenCalled();
  });

  it('supports center raycast hover and click-to-focus in FPS mode', () => {
    const fakeEngine = { setHardwareScalingLevel: vi.fn() };
    const scaler = new ResolutionScaler(fakeEngine);

    const fakeMesh = {
      name: 'art_1',
      metadata: { artworkId: 'art1' },
    } as unknown as AbstractMesh;

    const fakeCamera = {
      focusedMesh: null as AbstractMesh | null,
      focusOnArtwork: vi.fn(),
      clearFocus: vi.fn(),
      teleportTo: vi.fn(),
      isPointerLocked: true,
      exitPointerLock: vi.fn(),
      pickFromCenter: vi.fn(() => ({
        hit: true,
        pickedMesh: fakeMesh,
        pickedPoint: { x: 0, y: 1.5, z: -2 },
      })),
    } as unknown as CameraController;

    const fakeScene = {
      onPointerObservable: {
        add: vi.fn(() => ({})),
        remove: vi.fn(),
      },
      onBeforeRenderObservable: {
        add: vi.fn((cb) => {
          // Trigger once for render test
          cb();
          return {};
        }),
        remove: vi.fn(),
      },
    } as unknown as Scene;

    const onArtworkFocus = vi.fn();
    const onArtworkHover = vi.fn();

    const controller = wireInteraction(fakeScene, fakeCamera, scaler, {
      onArtworkFocus,
      onArtworkInspect: vi.fn(),
      onArtworkHover,
      onStateChange: vi.fn(),
    });

    expect(controller.getState()).toBe('ROAM');
    expect(onArtworkHover).toHaveBeenCalledWith('art1', expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });
});
