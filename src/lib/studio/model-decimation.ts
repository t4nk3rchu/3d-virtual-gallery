import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

// NOTE on Draco: gltf-transform's Draco encode/decode needs `draco3dgltf`, whose
// npm entry is a Node-only Emscripten build (it require()s ./draco_*_nodejs,
// which use fs/__dirname). It cannot run in the browser — under a bundler its
// wasm load fails with "CompileError: failed to match magic number". So this
// proxy pipeline intentionally does NOT Draco-compress: the proxy's real win is
// triangle reduction (meshopt `simplify`, whose wasm is base64-embedded and
// browser-safe), and a low-poly mesh is small enough uncompressed. A
// Draco-compressed *input* .glb therefore can't be read here — see the catch
// below. ponytail: add a browser Draco decoder only if real sources need it.

export interface DecimateOptions {
  /** Target fraction of triangles to keep (0-1). Default 0.5. */
  ratio?: number;
  /** Max simplification error (0-1). Default 0.001. */
  error?: number;
}

/**
 * Turn a full-detail GLB (ArrayBuffer) into a smaller low-poly proxy GLB
 * (Uint8Array). Runs entirely in the browser via meshopt WASM. The proxy is
 * uncompressed (no Draco) so it loads with no decoder in roam.
 */
export async function decimateGlb(input: ArrayBuffer, opts: DecimateOptions = {}): Promise<Uint8Array> {
  await MeshoptSimplifier.ready;

  const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);

  let doc;
  try {
    doc = await io.readBinary(new Uint8Array(input));
  } catch {
    throw new Error(
      'Could not read this .glb. If it uses Draco or meshopt compression, ' +
        'please export an uncompressed .glb — compressed sources are not supported yet.'
    );
  }

  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: opts.ratio ?? 0.5, error: opts.error ?? 0.001 }),
    prune(),
  );

  return io.writeBinary(doc);
}
