/**
 * Task 8: Camera controller — pure math helpers & FPS/Gallery Navigation
 *
 * Spec §5.1:
 *   - UniversalCamera at customizable eye height
 *   - Ellipsoid collision (0.5, 0.85, 0.5)
 *   - WASD + Arrow keys for smooth walking
 *   - Configurable drag-to-look camera controls & inversion
 *   - Perfect 90° perpendicular focus orientation
 */
import type { Scene, AbstractMesh, Observer } from '@babylonjs/core';
import {
  UniversalCamera,
  Vector3,
  Ray,
} from '@babylonjs/core';

// ─── CAMERA & MOVEMENT CONFIGURATION (Tweak these values) ─────────────────────
export const CAMERA_CONFIG = {
  /** Normal WASD walking speed (default: 0.02) */
  walkSpeed: 0.02,

  /** Sprint speed multiplier when holding Shift (default: 2.2) */
  sprintSpeed: 0.045,

  /** Field of View in degrees (default: 65) */
  fov: 65,

  // ── Desktop / PC (Mouse Look) ──────────────────────────────────────────────
  /** Desktop: Mouse sensitivity (higher = slower/smoother, lower = faster) */
  mouseSensitivity: 2000,

  /** Desktop: Invert horizontal mouse look (left/right) */
  invertMouseX: false,

  /** Desktop: Invert vertical mouse look (up/down) */
  invertMouseY: false,

  // ── Mobile / Tablet (Touch Drag) ───────────────────────────────────────────
  /** Mobile: Touch sensitivity (higher = slower/smoother, lower = faster) */
  touchSensitivity: 2000,

  /** Mobile: Invert horizontal touch look (left/right) */
  invertTouchX: true,

  /** Mobile: Invert vertical touch look (up/down) */
  invertTouchY: true,

  // ── General ────────────────────────────────────────────────────────────────
  /** Camera movement inertia (default: 0.5) */
  inertia: 0.5,

  /** Visitor eye level height in meters (default: 1.7) */
  eyeHeight: 1.7,
};
// ─────────────────────────────────────────────────────────────────────────────

/** Compute the camera position for focusing on an artwork. */
export function calculateFocusPosition(
  artworkPosition: { x: number; y: number; z: number },
  artworkNormal: { x: number; y: number; z: number },
  viewDistance: number
): { x: number; y: number; z: number } {
  return {
    x: artworkPosition.x + artworkNormal.x * viewDistance,
    y: artworkPosition.y,
    z: artworkPosition.z + artworkNormal.z * viewDistance,
  };
}

export class CameraController {
  readonly camera: UniversalCamera;
  readonly scene: Scene;
  private _focusedMesh: AbstractMesh | null = null;
  private _keysDown: Set<string> = new Set();
  private _renderObserver: Observer<Scene> | null = null;
  private _animating = false;
  private _onMovementCallback: (() => void) | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = new UniversalCamera(
      'playerCamera',
      new Vector3(0, CAMERA_CONFIG.eyeHeight, -6), // eye height from config, stepped back to view gallery
      scene
    );
    this.camera.setTarget(new Vector3(0, CAMERA_CONFIG.eyeHeight, 0)); // Look forward into the room

    // Collision ellipsoid (spec §5.1)
    this.camera.ellipsoid = new Vector3(0.5, 0.85, 0.5);
    this.camera.checkCollisions = true;
    this.camera.applyGravity = false;
    this.camera.minZ = 0.1;
    this.camera.inertia = CAMERA_CONFIG.inertia;

    // Attach basic canvas control and clear built-in inputs so our unified pointer look handles both mouse & touch
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType('FreeCameraMouseInput');
    this.camera.inputs.removeByType('FreeCameraTouchInput');
    this.camera.inputs.removeByType('FreeCameraPointersInput');
    this.camera.keysUp = [];
    this.camera.keysDown = [];
    this.camera.keysLeft = [];
    this.camera.keysRight = [];

    this._setupPointerLook(canvas);
    this._setupKeyboardControls(canvas);
    this._setupRenderLoop();
  }

  get focusedMesh(): AbstractMesh | null {
    return this._focusedMesh;
  }

  set onMovement(cb: (() => void) | null) {
    this._onMovementCallback = cb;
  }

  /** Update camera & movement parameters at runtime from Settings */
  updateConfig(newConfig: Partial<typeof CAMERA_CONFIG>): void {
    Object.assign(CAMERA_CONFIG, newConfig);
    if (newConfig.fov) {
      this.camera.fov = (newConfig.fov * Math.PI) / 180;
    }
  }

  private _setupPointerLook(canvas: HTMLCanvasElement) {
    let activePointerId: number | null = null;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.pointerType === 'touch') {
        activePointerId = e.pointerId;
        prevX = e.clientX;
        prevY = e.clientY;
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch { }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId || this._animating) return;

      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      const isTouch = e.pointerType === 'touch';
      const sens = 1 / Math.max(100, isTouch ? CAMERA_CONFIG.touchSensitivity : CAMERA_CONFIG.mouseSensitivity);
      const multX = (isTouch ? CAMERA_CONFIG.invertTouchX : CAMERA_CONFIG.invertMouseX) ? -1 : 1;
      const multY = (isTouch ? CAMERA_CONFIG.invertTouchY : CAMERA_CONFIG.invertMouseY) ? -1 : 1;

      // Rotate camera yaw (Y) and pitch (X) with device-specific inversion settings
      this.camera.rotation.y += dx * sens * multX * 4;
      this.camera.rotation.x += dy * sens * multY * 4;

      // Clamp vertical pitch to prevent flipping
      const maxPitch = Math.PI / 2.2;
      this.camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.camera.rotation.x));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId === e.pointerId) {
        activePointerId = null;
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch { }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  private _setupKeyboardControls(canvas: HTMLCanvasElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs or textareas
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'shift'].includes(key)) {
        this._keysDown.add(key);
        if (this._focusedMesh && ['w', 'a', 's', 'd'].includes(key)) {
          this._onMovementCallback?.();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this._keysDown.delete(e.key.toLowerCase());
    };

    const onBlur = () => {
      this._keysDown.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Auto-focus canvas on pointer down
    canvas.addEventListener('pointerdown', () => {
      canvas.focus();
    });
  }

  private _setupRenderLoop() {
    this._renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (this._animating) return;

      const engine = this.scene.getEngine ? this.scene.getEngine() : null;
      const dt = Math.min(0.1, (engine ? engine.getDeltaTime() : 16) / 1000);
      const keys = this._keysDown;

      // 1. Process Keyboard Walking
      if (keys.size > 0) {
        const isShift = keys.has('shift');
        const baseSpeed = isShift ? CAMERA_CONFIG.sprintSpeed : CAMERA_CONFIG.walkSpeed;

        let forwardMove = 0;
        let sideMove = 0;

        if (keys.has('w')) forwardMove += 1;
        if (keys.has('s')) forwardMove -= 1;
        if (keys.has('d')) sideMove += 1;
        if (keys.has('a')) sideMove -= 1;

        if (forwardMove !== 0 || sideMove !== 0) {
          // Compute horizontal direction from camera yaw (rotation.y)
          const yaw = this.camera.rotation.y;
          const forwardDir = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
          const rightDir = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

          const moveDir = forwardDir.scale(forwardMove).add(rightDir.scale(sideMove)).normalize();
          const moveDelta = moveDir.scale(baseSpeed);

          // Use cameraDirection so Babylon checks ellipsoid collisions against walls/floor
          this.camera.cameraDirection.addInPlace(moveDelta);
        }
      }

      // 2. Continuous Floor Gravity & Step-Down Handling
      // Cast a ray downward to detect the floor surface beneath the visitor
      const rayOrigin = new Vector3(
        this.camera.position.x,
        this.camera.position.y + 0.5,
        this.camera.position.z
      );
      const downRay = new Ray(rayOrigin, new Vector3(0, -1, 0), 12);
      const pick = this.scene.pickWithRay ? this.scene.pickWithRay(downRay, (mesh) => {
        if (!mesh.isVisible || !mesh.isPickable) return false;
        if (mesh.metadata?.isArtwork || mesh.metadata?.isHotspot || mesh.metadata?.isPlacard || mesh.metadata?.isGizmo) {
          return false;
        }
        return true;
      }) : null;

      const floorY = pick?.hit && pick.pickedPoint ? pick.pickedPoint.y : 0;
      const targetEyeY = floorY + CAMERA_CONFIG.eyeHeight;

      if (this.camera.position.y > targetEyeY + 0.005) {
        // Fall back down smoothly with gravity when stepping off chairs/benches/steps
        const fallSpeed = 9.8 * dt;
        this.camera.position.y = Math.max(targetEyeY, this.camera.position.y - fallSpeed);
      } else if (this.camera.position.y < targetEyeY - 0.005) {
        // Smoothly step up over low thresholds or stairs
        const stepSpeed = 4.5 * dt;
        this.camera.position.y = Math.min(targetEyeY, this.camera.position.y + stepSpeed);
      }

      // 3. Hard safety bounds clamp so player can never tunnel or pass through outer perimeter walls
      const bounds = (this.scene.metadata as {
        roomBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
      })?.roomBounds;
      if (bounds) {
        this.camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.camera.position.x));
        this.camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.camera.position.z));
      }
    });
  }

  /**
   * Apply joystick / virtual directional movement vector:
   * @param x -1 (left) to +1 (right)
   * @param y -1 (backward) to +1 (forward)
   * @param isSprint optional sprint multiplier
   */
  move(x: number, y: number, isSprint = false): void {
    if (this._animating) return;
    if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return;

    if (this._focusedMesh) {
      this._onMovementCallback?.();
    }

    const baseSpeed = isSprint ? CAMERA_CONFIG.sprintSpeed : CAMERA_CONFIG.walkSpeed;
    const yaw = this.camera.rotation.y;
    const forwardDir = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const rightDir = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const moveDir = forwardDir.scale(y).add(rightDir.scale(x));
    const len = moveDir.length();
    if (len > 0) {
      const intensity = Math.min(1, Math.sqrt(x * x + y * y));
      const moveDelta = moveDir.normalize().scale(baseSpeed * intensity);
      this.camera.cameraDirection.addInPlace(moveDelta);
    }

    const bounds = (this.scene.metadata as {
      roomBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
    })?.roomBounds;
    if (bounds) {
      this.camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.camera.position.x));
      this.camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.camera.position.z));
    }
  }

  /** Teleport camera to (x, cameraY, z) smoothly */
  teleportTo(x: number, z: number): void {
    const startPos = this.camera.position.clone();
    const targetPos = new Vector3(x, CAMERA_CONFIG.eyeHeight, z);

    this._animateCamera(startPos, targetPos, null, 400);
  }

  /**
   * Focus camera onto an artwork mesh.
   * Aligns camera to stand directly in front and look at it perpendicularly (90° orthogonal angle).
   * Dynamically adapts distance based on artwork size and camera FOV, and checks wall clearance.
   */
  focusOnArtwork(mesh: AbstractMesh, defaultViewDistance?: number): void {
    this._focusedMesh = mesh;

    // 1. Calculate mesh world matrix and center
    mesh.computeWorldMatrix(true);
    const worldMatrix = mesh.getWorldMatrix();
    const artCenter = mesh.getAbsolutePosition().clone();

    // 2. Local front normal in Babylon is (0, 0, -1)
    const localNormal = new Vector3(0, 0, -1);
    let worldNormal = Vector3.TransformNormal(localNormal, worldMatrix).normalize();

    // In case the normal is unnormalized or zero
    if (worldNormal.lengthSquared() < 0.1) {
      worldNormal = new Vector3(0, 0, 1);
    }

    // 3. Dynamic distance calculation based on FOV and artwork dimensions (fitFor)
    let idealDist = 1.6;
    if (defaultViewDistance !== undefined) {
      idealDist = defaultViewDistance;
    } else {
      const extend = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
      const width = Math.max(extend.x, extend.z) * 2;
      const height = extend.y * 2;

      const fovV = this.camera.fov;
      const aspect = this.scene.getEngine().getAspectRatio(this.camera) || 1.6;
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
      const fitDist =
        Math.max(
          height / (2 * Math.tan(fovV / 2)),
          width / (2 * Math.tan(fovH / 2))
        ) * 1.35;
      idealDist = Math.max(1.0, Math.min(5.5, fitDist));
    }

    // 4. Universal wall/obstacle clearance raycasting
    const ray = new Ray(artCenter, worldNormal, idealDist + 1.2);
    const hit = this.scene.pickWithRay(
      ray,
      (m) =>
        Boolean(
          m.checkCollisions &&
          m !== mesh &&
          !m.name.startsWith('artwork_') &&
          !m.name.startsWith('marker_')
        )
    );
    let finalDist = idealDist;
    if (hit && hit.hit && hit.distance > 0.6) {
      finalDist = Math.max(0.7, Math.min(idealDist, hit.distance - 0.45));
    }

    // 5. Compute target position and clamp against room bounds
    const eyeHeight = Math.max(1.3, Math.min(2.1, artCenter.y));
    let targetX = artCenter.x + worldNormal.x * finalDist;
    let targetZ = artCenter.z + worldNormal.z * finalDist;

    const bounds = (
      this.scene.metadata as {
        roomBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
      }
    )?.roomBounds;
    if (bounds) {
      targetX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
      targetZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, targetZ));
    }

    const targetPos = new Vector3(targetX, eyeHeight, targetZ);

    // 6. Smoothly glide position and track target so camera ends up facing artwork at 90°
    const startPos = this.camera.position.clone();
    this._animateCamera(startPos, targetPos, artCenter, 600);
  }

  private _animateCamera(
    startPos: Vector3,
    targetPos: Vector3,
    lookAtTarget: Vector3 | null,
    durationMs: number
  ) {
    this._animating = true;
    const startTime = performance.now();

    const animObserver = this.scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth cubic ease-out
      const t = 1 - Math.pow(1 - progress, 3);

      this.camera.position = Vector3.Lerp(startPos, targetPos, t);

      if (lookAtTarget) {
        this.camera.setTarget(lookAtTarget);
      }

      if (progress >= 1) {
        this.camera.position = targetPos.clone();
        if (lookAtTarget) {
          this.camera.setTarget(lookAtTarget);
        }
        this.scene.onBeforeRenderObservable.remove(animObserver);
        this._animating = false;
      }
    });
  }

  clearFocus(): void {
    this._focusedMesh = null;
  }

  /** Apply spawn position and orientation from spawn point object or JSON */
  applySpawn(spawnInput: { position?: number[]; target?: number[]; rotation?: number[] } | string | null): void {
    if (!spawnInput) return;
    try {
      const spawn = typeof spawnInput === 'string'
        ? (JSON.parse(spawnInput) as { position?: number[]; target?: number[]; rotation?: number[] })
        : spawnInput;

      if (spawn.position && spawn.position.length >= 3) {
        this.camera.position = new Vector3(
          Number(spawn.position[0]),
          Number(spawn.position[1]),
          Number(spawn.position[2])
        );
      }
      if (spawn.rotation && spawn.rotation.length >= 3) {
        this.camera.rotation = new Vector3(
          Number(spawn.rotation[0]),
          Number(spawn.rotation[1]),
          Number(spawn.rotation[2])
        );
      } else if (spawn.target && spawn.target.length >= 3) {
        this.camera.setTarget(
          new Vector3(
            Number(spawn.target[0]),
            Number(spawn.target[1]),
            Number(spawn.target[2])
          )
        );
      }
    } catch {
      // Invalid spawn JSON — keep defaults
    }
  }

  dispose(): void {
    if (this._renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this._renderObserver);
    }
    this._keysDown.clear();
  }
}
