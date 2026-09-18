import { describe, it, expect } from 'vitest';
import { Document, WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { decimateGlb } from './model-decimation';

async function makeDenseGlb(): Promise<ArrayBuffer> {
  const doc = new Document();
  const buf = doc.createBuffer();
  // 200 triangles sharing vertices — enough for the simplifier to collapse.
  const N = 200;
  const positions = new Float32Array(N * 9);
  const indices = new Uint32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const o = i * 9;
    positions.set([i, 0, 0, i + 1, 0, 0, i, 1, 0], o);
    indices.set([i * 3, i * 3 + 1, i * 3 + 2], i * 3);
  }
  const pos = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buf);
  const idx = doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setIndices(idx);
  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);
  const bytes = await new WebIO().writeBinary(doc);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('decimateGlb', () => {
  it('produces a smaller, valid GLB with fewer triangles', async () => {
    const dense = await makeDenseGlb();
    const proxy = await decimateGlb(dense, { ratio: 0.5 });
    expect(proxy.byteLength).toBeGreaterThan(0);
    // Re-read the proxy to confirm it is a valid GLB. The proxy is
    // Draco-compressed, so the reading WebIO needs the Draco decoder too.
    const decoder = await draco3d.createDecoderModule();
    const readIO = new WebIO()
      .registerExtensions(KHRONOS_EXTENSIONS)
      .registerDependencies({ 'draco3d.decoder': decoder });
    const doc = await readIO.readBinary(proxy);
    const totalIndices = doc.getRoot().listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0), 0);
    expect(totalIndices).toBeLessThan(200 * 3);
  }, 30000);
});
