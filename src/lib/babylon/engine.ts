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
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
import { ResolutionScaler } from './resolution-scaler';

export interface SceneHandle {
  engine: Engine;
  scene: Scene;
  scaler: ResolutionScaler;
  dispose(): void;
}

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

  KhronosTextureContainer2.URLConfig = {
    jsDecoderModule: '/decoders/basis_transcoder.js',
    wasmUASTCToASTC: '/decoders/uastc_to_astc.wasm',
    wasmUASTCToBC7: '/decoders/uastc_to_bc7.wasm',
    wasmUASTCToRGBA_UNORM: '/decoders/uastc_to_rgba_unorm.wasm',
    wasmUASTCToRGBA_SRGB: '/decoders/uastc_to_rgba_srgb.wasm',
    wasmUASTCToR8_UNORM: '/decoders/uastc_to_r8_unorm.wasm',
    wasmUASTCToRG8_UNORM: '/decoders/uastc_to_rg8_unorm.wasm',
    jsMSCTranscoder: '/decoders/basis_transcoder.js',
    wasmMSCTranscoder: '/decoders/basis_transcoder.wasm',
    wasmZSTDDecoder: '/decoders/zstddec.wasm',
  };
}

/**
 * Initialise a Babylon engine + scene on the given canvas.
 * Returns a handle that disposes cleanly when the viewer unmounts.
 */
export function initScene(canvas: HTMLCanvasElement): SceneHandle {
  configureSelfHostedDecoders();

  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
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

  // Resolution scaler — starts at WALK (75%)
  const scaler = new ResolutionScaler(engine);

  // Render loop
  engine.runRenderLoop(() => scene.render());

  // Handle canvas resize
  const handleResize = () => engine.resize();
  window.addEventListener('resize', handleResize);
  engine.resize();
  setTimeout(handleResize, 50);

  function dispose() {
    window.removeEventListener('resize', handleResize);
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  }

  return { engine, scene, scaler, dispose };
}
