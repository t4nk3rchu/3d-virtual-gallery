import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, draco, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

let ioPromise: Promise<WebIO> | null = null;

/** WebIO with the Draco encoder/decoder registered (memoised — the WASM loads once). */
async function getIO(): Promise<WebIO> {
  if (!ioPromise) {
    ioPromise = (async () => {
      const [decoder, encoder] = await Promise.all([
        draco3d.createDecoderModule(),
        draco3d.createEncoderModule(),
      ]);
      return new WebIO()
        .registerExtensions(KHRONOS_EXTENSIONS)
        .registerDependencies({ 'draco3d.decoder': decoder, 'draco3d.encoder': encoder });
    })().catch((err) => {
      ioPromise = null;
      throw err;
    });
  }
  return ioPromise;
}

export interface DecimateOptions {
  /** Target fraction of triangles to keep (0-1). Default 0.5. */
  ratio?: number;
  /** Max simplification error (0-1). Default 0.001. */
  error?: number;
}

/**
 * Turn a full-detail GLB (ArrayBuffer) into a small, Draco-compressed low-poly
 * proxy GLB (Uint8Array). Runs entirely in the browser via WASM.
 */
export async function decimateGlb(input: ArrayBuffer, opts: DecimateOptions = {}): Promise<Uint8Array> {
  const io = await getIO();
  await MeshoptSimplifier.ready;

  const doc = await io.readBinary(new Uint8Array(input));
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: opts.ratio ?? 0.5, error: opts.error ?? 0.001 }),
    prune(),
    draco(),
  );
  return io.writeBinary(doc);
}
