/**
 * Task 6: Babylon engine + scene lifecycle
 *
 * initScene returns a disposable handle so React components can clean up.
 * Self-hosted Draco/KTX2 decoders are configured here (spec §5.6).
 */
import {
  Engine,
  Scene,
  HemisphericLight,
  Vector3,
  Color4,
  DefaultRenderingPipeline,
} from '@babylonjs/core';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/dracoCompression';
import { ResolutionScaler } from './resolution-scaler';

export interface SceneHandle {
  engine: Engine;
  scene: Scene;
  scaler: ResolutionScaler;
  /** Force at least one more frame to render (for one-off changes: texture loads, resize, new meshes). */
  requestRender(): void;
  /** Register a predicate polled each frame; return true to keep rendering (e.g. camera is moving). */
  addActivityCheck(fn: () => boolean): void;
  dispose(): void;
}

export interface InitSceneOptions {
  /**
   * Render only while something is happening (camera moving, animating, or a
   * requestRender/activity-check asks for it) instead of every frame. Safe here
   * because the scene is static geometry — no video textures or looping
   * animations. Off by default; the public viewer opts in, the studio does not
   * (live gizmo editing needs continuous rendering).
   */
  renderOnDemand?: boolean;
}

const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth <= 768 || window.innerHeight <= 520);

/**
 * Point Babylon at self-hosted decoder assets (spec §5.6).
 * These assets are copied to /public/decoders/ by the build.
 */
function configureSelfHostedDecoders(): void {
  DracoCompression.Configuration = {
    decoder: {
      wasmUrl: '/decoders/draco_wasm_wrapper_gltf.js',
      wasmBinaryUrl: '/decoders/draco_decoder_gltf.wasm',
      fallbackUrl: '/decoders/draco_decoder_gltf.js',
    },
  };
}

/**
 * Initialise a Babylon engine + scene on the given canvas.
 * Returns a handle that disposes cleanly when the viewer unmounts.
 */
export function initScene(canvas: HTMLCanvasElement, opts: InitSceneOptions = {}): SceneHandle {
  configureSelfHostedDecoders();

  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';

  const engine = new Engine(canvas, true, {
    // Nothing reads pixels back (no screenshots), so we don't need the buffer for
    // that. But render-on-demand leaves the canvas idle between frames; some mobile
    // GPUs don't retain an unpreserved buffer while idle and flicker to black. Keep
    // it preserved only when rendering intermittently (viewer); the always-render
    // path (studio) redraws every frame and skips the cost.
    preserveDrawingBuffer: opts.renderOnDemand === true,
    stencil: true,
    antialias: true,
    adaptToDeviceRatio: true,
  });

  const scene = new Scene(engine);
  scene.collisionsEnabled = true;
  scene.clearColor = new Color4(0.04, 0.05, 0.08, 1);

  // Base ambient light (spec §5.2)
  new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);

  // FXAA post-process pipeline (spec §5.2)
  const pipeline = new DefaultRenderingPipeline('default', true, scene);
  pipeline.fxaaEnabled = true;

  // Resolution scaler — starts at WALK. Mobile GPUs render the roam view softer.
  const scaler = new ResolutionScaler(engine, isMobileViewport() ? 0.6 : 0.75);

  // ── Render-on-demand ────────────────────────────────────────────────────────
  // The scene is static (no video/animated textures), so we only need to draw
  // when the camera moves, an animation runs, or a change is requested. When
  // disabled (studio), we render every frame.
  const activityChecks: Array<() => boolean> = [];
  const COOLDOWN_MS = 400;
  let renderUntil = performance.now() + 2000; // draw the first ~2s (load, curtain, settle)
  let lastCamKey = '';

  const requestRender = () => {
    renderUntil = performance.now() + COOLDOWN_MS;
  };

  const cameraMoved = (): boolean => {
    const cam = scene.activeCamera as unknown as {
      position?: Vector3;
      rotation?: Vector3;
    } | null;
    if (!cam?.position) return false;
    const p = cam.position;
    const r = cam.rotation ?? { x: 0, y: 0, z: 0 };
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)},${r.x.toFixed(4)},${r.y.toFixed(4)},${r.z.toFixed(4)}`;
    if (key !== lastCamKey) {
      lastCamKey = key;
      return true;
    }
    return false;
  };

  const shouldRender = (): boolean => {
    if (!opts.renderOnDemand) return true;
    if (cameraMoved()) {
      renderUntil = performance.now() + COOLDOWN_MS;
      return true;
    }
    if (performance.now() < renderUntil) return true;
    return activityChecks.some((fn) => fn());
  };

  engine.runRenderLoop(() => {
    if (shouldRender()) scene.render();
  });

  // Handle canvas resize
  const handleResize = () => {
    engine.resize();
    requestRender();
  };
  window.addEventListener('resize', handleResize);
  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
  }
  engine.resize();
  setTimeout(handleResize, 50);

  function dispose() {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', handleResize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  }

  return {
    engine,
    scene,
    scaler,
    requestRender,
    addActivityCheck: (fn) => activityChecks.push(fn),
    dispose,
  };
}
