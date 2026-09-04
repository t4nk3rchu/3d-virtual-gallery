# 3D Model Artwork Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `MODEL_3D` artworks with a low-poly roam proxy and a dedicated 360° inspect viewer that supports surface-anchored hotspots, from a single curator upload.

**Architecture:** A `MODEL_3D` artwork reuses the existing artwork pipeline (placement, focus, placard, hotspot data, audio). New pieces: a `gltf-transform` in-browser decimation step that turns one uploaded `.glb` into a low-poly proxy; a roam factory that renders the proxy on a pedestal; and a `Model360Viewer` with its own Babylon `ArcRotateCamera` that loads the full model on demand, projects 3D hotspots to DOM pins, and disposes on close.

**Tech Stack:** React 19 + TypeScript, BabylonJS 7 (`@babylonjs/core`, `@babylonjs/loaders`), Cloudflare Workers + D1, `gltf-transform` (+ `meshoptimizer`, `draco3dgltf`) for decimation, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-04-3d-model-support-design.md`.
- One curator upload only; the proxy is generated in-browser, not hand-made.
- Roam loads **only** the proxy; the **full** model loads only inside the 360 viewer and is disposed on close.
- v1 does NOT recompress the full model — `media_file_id` is the picked `.glb` as-is; only the proxy is generated/compressed/uploaded.
- Proxy decimation targets: `ratio: 0.5`, capped so the result stays small; textures are not upscaled. No quality slider in v1.
- Hotspot 3D anchor stored as `anchor_3d_json = { p:[x,y,z], n:[x,y,z] }` in model-local space.
- Reuse existing units unchanged: `HotspotEditor` form, hotspot info card, audio system, transform gizmo, self-hosted Draco decoders (`src/lib/babylon/engine.ts`), media proxy (`worker/media-proxy.ts`).
- CSS colors must be REDA tokens or `rgba()` — never raw `#hex` (enforced by `src/lib/reda-viewer-css.test.ts`).
- Commit after every task.

---

### Task 1: Data model — `MODEL_3D` type, new columns, worker CRUD

**Files:**
- Modify: `src/types/schema.ts:77` (ArtworkType), `:80-98` (Artwork), `:120-130` (ArtworkHotspot)
- Create: `migrations/0008_model_3d.sql`
- Modify: `worker/db.ts:22-26` (ARTWORK_UPDATE_COLS), `:322-350` (createArtworkRecord), and the hotspot create/update functions
- Modify: `worker/db.test.ts:35-41` and `worker/routes/crud.test.ts:29-34` (migration lists)
- Test: `worker/db.test.ts`

**Interfaces:**
- Produces: `ArtworkType` now includes `'MODEL_3D'`; `Artwork.model_proxy_file_id: string | null`; `ArtworkHotspot.anchor_3d_json: string | null`. Migration `0008_model_3d.sql`. CRUD reads/writes both new columns.

- [ ] **Step 1: Write the failing migration-list + round-trip test**

In `worker/db.test.ts`, add `'0008_model_3d.sql'` to the migration array (after `'0007_hotspot_audio_end.sql'`), then add this test in the same describe block:

```ts
it('persists model_proxy_file_id on artworks and anchor_3d_json on hotspots', async () => {
  const ex = await createExhibition(db, { room_id: 'room-modern', title: 'M', slug: 'm', user_id: 'u1' } as any);
  const art = await createArtworkRecord(db, {
    exhibition_id: ex.id, title: 'Statue', artist: 'A', year: null, medium: null,
    dimensions: null, description: null, artwork_type: 'MODEL_3D',
    media_file_id: 'full-glb', model_proxy_file_id: 'proxy-glb', youtube_video_id: null,
    audio_guide_file_id: null, transform_json: '{}', frame_config_json: '{}',
    order_index: 0, artist_id: null,
  } as any);
  expect(art.model_proxy_file_id).toBe('proxy-glb');

  const hs = await createHotspot(db, {
    artwork_id: art.id, x_percent: 0, y_percent: 0, title: 'Head', description: '',
    audio_timestamp_seconds: null, audio_timestamp_end_seconds: null, audio_file_id: null,
    anchor_3d_json: JSON.stringify({ p: [0, 1, 0], n: [0, 0, 1] }),
  } as any);
  expect(JSON.parse(hs.anchor_3d_json!).p).toEqual([0, 1, 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run worker/db.test.ts -t "persists model_proxy"`
Expected: FAIL — `no such column: model_proxy_file_id` (migration + types missing).

- [ ] **Step 3: Add the migration**

Create `migrations/0008_model_3d.sql`:

```sql
-- 3D model artwork support: proxy file + 3D hotspot anchor
ALTER TABLE artworks ADD COLUMN model_proxy_file_id TEXT;
ALTER TABLE artwork_hotspots ADD COLUMN anchor_3d_json TEXT;
```

- [ ] **Step 4: Update the TypeScript types**

In `src/types/schema.ts`, change line 77 and remove the stub comment:

```ts
export type ArtworkType = 'IMAGE_2D' | 'VIDEO' | 'MODEL_3D';
```

Add to the `Artwork` interface (after `media_file_id`):

```ts
  model_proxy_file_id: string | null;  // decimated low-poly .glb for roam (MODEL_3D)
```

Add to the `ArtworkHotspot` interface (after `y_percent`):

```ts
  anchor_3d_json: string | null;  // MODEL_3D: JSON { p:[x,y,z], n:[x,y,z] } in model-local space
```

- [ ] **Step 5: Update worker CRUD**

In `worker/db.ts`, add `'model_proxy_file_id'` to `ARTWORK_UPDATE_COLS` (line 22-26). In `createArtworkRecord` (line ~331) add the column to the INSERT column list and values (mirror how `media_file_id` is bound): add `model_proxy_file_id` to the column list and `input.model_proxy_file_id ?? null` to the bound values.

Find the hotspot create function (search `INSERT INTO artwork_hotspots`). Add `anchor_3d_json` to its column list and bind `input.anchor_3d_json ?? null`. In `updateHotspot` (added earlier this project — search `UPDATE artwork_hotspots`), add `['anchor_3d_json', input.anchor_3d_json ?? null]` to the `fields` array so edits persist the anchor.

- [ ] **Step 6: Fix the other test's migration list**

In `worker/routes/crud.test.ts:29-34`, append `'0007_hotspot_audio_end.sql'` and `'0008_model_3d.sql'` so its in-memory DB has the columns.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run worker/db.test.ts worker/routes/crud.test.ts`
Expected: PASS (all).

- [ ] **Step 8: Commit**

```bash
git add src/types/schema.ts migrations/0008_model_3d.sql worker/db.ts worker/db.test.ts worker/routes/crud.test.ts
git commit -m "feat: MODEL_3D artwork type, proxy file id, 3D hotspot anchor (schema + CRUD)"
```

---

### Task 2: In-browser GLB decimation (`model-decimation.ts`)

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/lib/studio/model-decimation.ts`
- Test: `src/lib/studio/model-decimation.test.ts`

**Interfaces:**
- Produces: `decimateGlb(input: ArrayBuffer, opts?: { ratio?: number; error?: number }): Promise<Uint8Array>` — returns a low-poly, Draco-compressed `.glb`.

- [ ] **Step 1: Add dependencies**

Run:
```bash
pnpm add @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer draco3dgltf
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/studio/model-decimation.test.ts`. It builds a dense in-memory GLB (a subdivided grid), decimates it, and asserts the result is a smaller, valid GLB with fewer indices:

```ts
import { describe, it, expect } from 'vitest';
import { Document, WebIO } from '@gltf-transform/core';
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
    // Re-read the proxy to confirm it is a valid GLB.
    const doc = await new WebIO().readBinary(proxy);
    const totalIndices = doc.getRoot().listMeshes()
      .flatMap((m) => m.listPrimitives())
      .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0), 0);
    expect(totalIndices).toBeLessThan(200 * 3);
  }, 30000);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/studio/model-decimation.test.ts`
Expected: FAIL — `decimateGlb is not a function` / module not found.

- [ ] **Step 4: Implement `decimateGlb`**

Create `src/lib/studio/model-decimation.ts`:

```ts
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
    })();
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/studio/model-decimation.test.ts`
Expected: PASS (may take several seconds while WASM initialises).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/studio/model-decimation.ts src/lib/studio/model-decimation.test.ts
git commit -m "feat: in-browser GLB decimation via gltf-transform (proxy generation)"
```

---

### Task 3: 3D hotspot math (`model-hotspot-math.ts`)

**Files:**
- Create: `src/lib/babylon/model-hotspot-math.ts`
- Test: `src/lib/babylon/model-hotspot-math.test.ts`

**Interfaces:**
- Produces:
  - `pinScaleForRadius(radius: number, minRadius: number, maxRadius: number, minPx: number, maxPx: number): number` — larger when zoomed out (radius high), smaller when zoomed in; clamped to `[minPx, maxPx]`.
  - `isPointFacingCamera(pointWorld: Vector3, normalWorld: Vector3, cameraPos: Vector3): boolean` — dot-product occlusion test.

- [ ] **Step 1: Write the failing test**

Create `src/lib/babylon/model-hotspot-math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { pinScaleForRadius, isPointFacingCamera } from './model-hotspot-math';

describe('pinScaleForRadius', () => {
  it('is largest when fully zoomed out and smallest when zoomed in', () => {
    expect(pinScaleForRadius(10, 2, 10, 14, 40)).toBe(40); // max radius -> max px
    expect(pinScaleForRadius(2, 2, 10, 14, 40)).toBe(14);  // min radius -> min px
  });
  it('clamps out-of-range radii', () => {
    expect(pinScaleForRadius(100, 2, 10, 14, 40)).toBe(40);
    expect(pinScaleForRadius(0, 2, 10, 14, 40)).toBe(14);
  });
});

describe('isPointFacingCamera', () => {
  const cam = new Vector3(0, 0, 5);
  it('true when the surface normal points toward the camera', () => {
    expect(isPointFacingCamera(new Vector3(0, 0, 1), new Vector3(0, 0, 1), cam)).toBe(true);
  });
  it('false when the normal points away (occluded on the far side)', () => {
    expect(isPointFacingCamera(new Vector3(0, 0, -1), new Vector3(0, 0, -1), cam)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/babylon/model-hotspot-math.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the math**

Create `src/lib/babylon/model-hotspot-math.ts`:

```ts
import { Vector3 } from '@babylonjs/core';

/**
 * Pin diameter in px, scaled linearly with camera radius and clamped.
 * Zoomed out (radius near maxRadius) -> maxPx so the hotspot is noticeable;
 * zoomed in (radius near minRadius) -> minPx so it does not obstruct.
 */
export function pinScaleForRadius(
  radius: number, minRadius: number, maxRadius: number, minPx: number, maxPx: number,
): number {
  const span = maxRadius - minRadius;
  const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (radius - minRadius) / span));
  return minPx + t * (maxPx - minPx);
}

/**
 * True when the hotspot's surface faces the camera. Uses the stored surface
 * normal (world space) vs. the direction from the point to the camera — a cheap
 * per-frame occlusion test with no raycast.
 */
export function isPointFacingCamera(
  pointWorld: Vector3, normalWorld: Vector3, cameraPos: Vector3,
): boolean {
  const toCamera = cameraPos.subtract(pointWorld);
  return Vector3.Dot(normalWorld, toCamera) > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/babylon/model-hotspot-math.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/babylon/model-hotspot-math.ts src/lib/babylon/model-hotspot-math.test.ts
git commit -m "feat: 3D hotspot pin scaling + facing-camera occlusion math"
```

---

### Task 4: Roam proxy factory (`model3d-factory.ts`)

**Files:**
- Create: `src/lib/babylon/model3d-factory.ts`
- Modify: `src/lib/babylon/artwork-factory.ts:253-264` (add `MODEL_3D` case)
- Test: `src/lib/babylon/model3d-factory.test.ts`

**Interfaces:**
- Consumes: `Artwork` (Task 1), `proxyMediaUrl` from `src/lib/media/gdrive.ts`, `deserializeTransform` from `src/lib/studio/transform.ts`.
- Produces: `createModel3DArtwork(scene: Scene, artwork: Artwork, onLoaded?: () => void): void` and a `MODEL_3D` case in `createArtworkMesh`. Also exports `resolveModelProxyUrl(artwork: Artwork): string | null` (testable without WebGL).

- [ ] **Step 1: Write the failing test (pure helper)**

Create `src/lib/babylon/model3d-factory.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveModelProxyUrl } from './model3d-factory';

const base = {
  id: 'a1', exhibition_id: 'e1', title: 'S', artist: 'A', year: null, medium: null,
  dimensions: null, description: null, artwork_type: 'MODEL_3D' as const,
  media_file_id: 'full', youtube_video_id: null, audio_guide_file_id: null,
  transform_json: '{}', frame_config_json: '{}', order_index: 0, updated_at: 1,
};

describe('resolveModelProxyUrl', () => {
  it('returns the proxy media URL when a proxy id is set', () => {
    expect(resolveModelProxyUrl({ ...base, model_proxy_file_id: 'proxy' })).toContain('proxy');
  });
  it('returns null when no proxy id (nothing to render in roam)', () => {
    expect(resolveModelProxyUrl({ ...base, model_proxy_file_id: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/babylon/model3d-factory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

Create `src/lib/babylon/model3d-factory.ts`:

```ts
import type { Scene } from '@babylonjs/core';
import { Vector3, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Artwork } from '../../types/schema';
import { proxyMediaUrl } from '../media/gdrive';
import { deserializeTransform } from '../studio/transform';

/** Roam proxy media URL, or null if this model has no generated proxy yet. */
export function resolveModelProxyUrl(artwork: Artwork): string | null {
  if (!artwork.model_proxy_file_id) return null;
  return proxyMediaUrl(artwork.model_proxy_file_id, artwork.updated_at);
}

/**
 * Load the low-poly proxy GLB into the roam scene at the placed transform.
 * Root mesh is tagged with metadata so hover/click interaction can resolve it.
 */
export function createModel3DArtwork(scene: Scene, artwork: Artwork, onLoaded?: () => void): void {
  const url = resolveModelProxyUrl(artwork);
  if (!url) { onLoaded?.(); return; }

  const t = deserializeTransform(artwork.transform_json);
  SceneLoader.ImportMesh('', url, '', scene, (meshes) => {
    const root = meshes[0];
    if (root) {
      root.name = artwork.id;
      root.position = new Vector3(...t.position);
      root.rotation = new Vector3(...t.rotation);
      root.scaling = new Vector3(...t.scale);
      for (const m of meshes) {
        m.isPickable = true;
        m.metadata = { ...(m.metadata ?? {}), artworkId: artwork.id, isModel3D: true };
      }
    }
    onLoaded?.();
  }, undefined, (_s, msg) => {
    console.error(`[model3d-factory] proxy load failed for ${artwork.id}: ${msg}`);
    onLoaded?.();
  });
}
```

- [ ] **Step 4: Wire into the factory switch**

In `src/lib/babylon/artwork-factory.ts`, import at the top:

```ts
import { createModel3DArtwork } from './model3d-factory';
```

Add the case inside `createArtworkMesh` (before `default:`):

```ts
    case 'MODEL_3D':
      createModel3DArtwork(scene, artwork, onTextureLoaded);
      return null;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/babylon/model3d-factory.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full suite + typecheck**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/babylon/model3d-factory.ts src/lib/babylon/model3d-factory.test.ts src/lib/babylon/artwork-factory.ts
git commit -m "feat: roam proxy factory for MODEL_3D artworks"
```

---

### Task 5: Studio — MODEL_3D type + upload with auto-decimation

**Files:**
- Modify: `src/components/studio/ArtworkForm.tsx` (add `MODEL_3D` option + model file picker)
- Create: `src/lib/studio/model-upload.ts` (fetch full → decimate → upload proxy)
- Test: `src/lib/studio/model-upload.test.ts`

**Interfaces:**
- Consumes: `decimateGlb` (Task 2), `proxyMediaUrl` (`src/lib/media/gdrive.ts`), the existing Drive upload helper in `src/lib/studio/google-picker.ts`.
- Produces: `generateAndUploadProxy(fullFileId: string, uploadFn: (bytes: Uint8Array, name: string) => Promise<string>, fetchFn?: typeof fetch): Promise<string>` — returns the new proxy Drive file id.

- [ ] **Step 1: Write the failing test**

Create `src/lib/studio/model-upload.test.ts` (mocks `decimateGlb` and the network so it is fast and deterministic):

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('./model-decimation', () => ({
  decimateGlb: vi.fn(async () => new Uint8Array([0x67, 0x6c, 0x54, 0x46])), // "glTF"
}));

import { generateAndUploadProxy } from './model-upload';

describe('generateAndUploadProxy', () => {
  it('fetches the full model, decimates it, and uploads the proxy', async () => {
    const fakeFetch = vi.fn(async () => new Response(new ArrayBuffer(64)));
    const upload = vi.fn(async () => 'proxy-file-id');
    const id = await generateAndUploadProxy('full-id', upload, fakeFetch as any);
    expect(id).toBe('proxy-file-id');
    expect(upload).toHaveBeenCalledOnce();
    const [, name] = upload.mock.calls[0];
    expect(name).toMatch(/proxy/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/studio/model-upload.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `generateAndUploadProxy`**

Create `src/lib/studio/model-upload.ts`:

```ts
import { proxyMediaUrl } from '../media/gdrive';
import { decimateGlb } from './model-decimation';

/**
 * Fetch the picked full GLB (through the media proxy), decimate it in-browser,
 * and upload the resulting proxy GLB via `uploadFn`. Returns the proxy file id.
 */
export async function generateAndUploadProxy(
  fullFileId: string,
  uploadFn: (bytes: Uint8Array, name: string) => Promise<string>,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchFn(proxyMediaUrl(fullFileId));
  if (!res.ok) throw new Error(`Failed to fetch model for decimation (${res.status})`);
  const full = await res.arrayBuffer();
  const proxy = await decimateGlb(full, { ratio: 0.5 });
  return uploadFn(proxy, `${fullFileId}-proxy.glb`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/studio/model-upload.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into `ArtworkForm`**

In `src/components/studio/ArtworkForm.tsx`:
1. Add `MODEL_3D` to the artwork-type selector (follow how `IMAGE_2D`/`VIDEO` options are rendered).
2. When `artwork_type === 'MODEL_3D'`, show a "3D Model (.glb)" picker that reuses the existing Google Drive picker path used for images. On pick, set `media_file_id` to the picked id, then show a "Generating proxy…" progress state and call:

```ts
import { generateAndUploadProxy } from '../../lib/studio/model-upload';
// ...inside the model-pick handler, after media_file_id is set:
setProxyStatus('generating');
try {
  const proxyId = await generateAndUploadProxy(pickedFileId, uploadDriveGlb); // uploadDriveGlb: existing Drive upload helper
  setForm((f) => ({ ...f, model_proxy_file_id: proxyId }));
  setProxyStatus('done');
} catch (e) {
  setProxyStatus('error');
}
```

`uploadDriveGlb(bytes, name)` uploads to Drive with the picker's `drive.file` token (reuse the existing multipart upload used elsewhere in Studio; if none exists yet, add a small helper in `google-picker.ts` that POSTs to `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with the cached token and returns the new file id). Include `model_proxy_file_id` in the create/update payload sent to the artworks API.

- [ ] **Step 6: Run typecheck + suite**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/studio/model-upload.ts src/lib/studio/model-upload.test.ts src/components/studio/ArtworkForm.tsx src/lib/studio/google-picker.ts
git commit -m "feat: studio MODEL_3D upload with auto proxy generation"
```

---

### Task 6: Studio — 3D hotspot placement editor

**Files:**
- Create: `src/lib/babylon/model-hotspot-anchor.ts` (serialize/parse the anchor)
- Create: `src/components/studio/Model3DHotspotEditor.tsx` (load full model, click-to-drop)
- Modify: `src/components/studio/HotspotEditor.tsx` (render the 3D editor when the artwork is `MODEL_3D`, reusing the existing title/description/audio form fields)
- Test: `src/lib/babylon/model-hotspot-anchor.test.ts`

**Interfaces:**
- Consumes: `ArtworkHotspot` (Task 1), Babylon `Vector3`.
- Produces:
  - `serializeAnchor(point: Vector3, normal: Vector3): string`
  - `parseAnchor(json: string | null): { p: Vector3; n: Vector3 } | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/babylon/model-hotspot-anchor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { serializeAnchor, parseAnchor } from './model-hotspot-anchor';

describe('anchor serialize/parse', () => {
  it('round-trips a point and normal', () => {
    const json = serializeAnchor(new Vector3(1, 2, 3), new Vector3(0, 0, 1));
    expect(JSON.parse(json)).toEqual({ p: [1, 2, 3], n: [0, 0, 1] });
    const parsed = parseAnchor(json)!;
    expect(parsed.p.asArray()).toEqual([1, 2, 3]);
    expect(parsed.n.asArray()).toEqual([0, 0, 1]);
  });
  it('returns null for null/invalid input', () => {
    expect(parseAnchor(null)).toBeNull();
    expect(parseAnchor('not json')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/babylon/model-hotspot-anchor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the anchor helpers**

Create `src/lib/babylon/model-hotspot-anchor.ts`:

```ts
import { Vector3 } from '@babylonjs/core';

export function serializeAnchor(point: Vector3, normal: Vector3): string {
  return JSON.stringify({ p: [point.x, point.y, point.z], n: [normal.x, normal.y, normal.z] });
}

export function parseAnchor(json: string | null): { p: Vector3; n: Vector3 } | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as { p: number[]; n: number[] };
    if (!Array.isArray(o.p) || !Array.isArray(o.n)) return null;
    return { p: Vector3.FromArray(o.p), n: Vector3.FromArray(o.n) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/babylon/model-hotspot-anchor.test.ts`
Expected: PASS.

- [ ] **Step 5: Build `Model3DHotspotEditor`**

Create `src/components/studio/Model3DHotspotEditor.tsx`. It renders a `<canvas>`, loads the **full** model (`SceneLoader.ImportMesh` on `proxyMediaUrl(media_file_id)`) into a small Babylon scene with an `ArcRotateCamera`, and registers a pointer-pick:

```ts
scene.onPointerObservable.add((pi) => {
  if (pi.type !== PointerEventTypes.POINTERPICK) return;
  const hit = pi.pickInfo;
  if (!hit?.hit || !hit.pickedPoint || !hit.pickedMesh) return;
  // Local-space point + normal (so the anchor is independent of placement).
  const inv = hit.pickedMesh.getWorldMatrix().clone().invert();
  const localPoint = Vector3.TransformCoordinates(hit.pickedPoint, inv);
  const worldNormal = hit.getNormal(true) ?? new Vector3(0, 0, 1);
  const localNormal = Vector3.TransformNormal(worldNormal, inv).normalize();
  onDropHotspot(serializeAnchor(localPoint, localNormal)); // parent opens the title/desc/audio form
});
```

Props: `{ fullModelFileId: string; onDropHotspot(anchorJson: string): void }`. Dispose the scene/engine on unmount (mirror `engine.ts` disposal).

- [ ] **Step 6: Branch in `HotspotEditor`**

In `src/components/studio/HotspotEditor.tsx`, when the selected artwork's `artwork_type === 'MODEL_3D'`, render `<Model3DHotspotEditor>` in place of the 2D image+overlay placement UI, and set `anchor_3d_json` (from `onDropHotspot`) on the payload instead of `x_percent`/`y_percent`. Keep the existing title/description/audio fields and the create/update calls unchanged (they already carry the extra field after Task 1).

- [ ] **Step 7: Run typecheck + suite**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/babylon/model-hotspot-anchor.ts src/lib/babylon/model-hotspot-anchor.test.ts src/components/studio/Model3DHotspotEditor.tsx src/components/studio/HotspotEditor.tsx
git commit -m "feat: studio 3D hotspot placement editor (click-to-drop on model)"
```

---

### Task 7: 360° inspect viewer (`Model360Viewer.tsx`)

**Files:**
- Create: `src/components/viewer/Model360Viewer.tsx`
- Create: `src/styles/model-360.css` (imported by the component; REDA tokens / rgba only)
- Test: `src/components/viewer/Model360Viewer.test.tsx`

**Interfaces:**
- Consumes: `pinScaleForRadius`, `isPointFacingCamera` (Task 3); `parseAnchor` (Task 6); `proxyMediaUrl`; `ArtworkHotspot`, `Artwork` (Task 1); the existing hotspot info card + audio components used by `InspectLightbox`.
- Produces: `Model360Viewer({ artwork, hotspots, onClose }: { artwork: Artwork; hotspots: ArtworkHotspot[]; onClose(): void })`.

- [ ] **Step 1: Write the failing test (render/loading smoke test)**

Create `src/components/viewer/Model360Viewer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Model360Viewer } from './Model360Viewer';

// Babylon needs no real WebGL for this smoke test: assert the loading chrome renders.
const artwork = {
  id: 'a1', artwork_type: 'MODEL_3D', media_file_id: 'full', model_proxy_file_id: 'p',
  title: 'Statue', artist: 'A', updated_at: 1,
} as any;

describe('Model360Viewer', () => {
  it('renders the loading state and a close button', () => {
    render(<Model360Viewer artwork={artwork} hotspots={[]} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /close|exit/i })).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/Model360Viewer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Model360Viewer`**

Create `src/components/viewer/Model360Viewer.tsx`. Structure:
- A full-screen overlay with a `<canvas>`, a close button, a hotspot list drawer (reuse the existing drawer markup/classes from `InspectLightbox`), and absolutely-positioned DOM pins.
- On mount: create a Babylon `Engine` + `Scene` + `ArcRotateCamera` (`alpha`, `beta`, `radius`), a `HemisphericLight`, then `SceneLoader.ImportMesh('', proxyMediaUrl(artwork.media_file_id, artwork.updated_at), '', scene, ...)`. Show a loading overlay until `onSuccess`. Frame the camera to the model bounds; set `camera.lowerRadiusLimit`/`upperRadiusLimit` from the bounding radius.
- Attach `camera.attachControl(canvas, true)` for drag-orbit + wheel/pinch zoom.
- Each frame (`scene.onBeforeRenderObservable`), for every hotspot with a parsed anchor: transform its local point/normal by the root mesh world matrix, project the point with `Vector3.Project(worldPoint, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()))`, set the pin's `left/top`; set its diameter with `pinScaleForRadius(camera.radius, camera.lowerRadiusLimit!, camera.upperRadiusLimit!, 14, 40)`; set `opacity: 0` (via a CSS class) when `!isPointFacingCamera(worldPoint, worldNormal, camera.position)`.
- Clicking a pin or list item: animate `camera.alpha`/`camera.beta` (Babylon `Animation.CreateAndStartAnimation`) so the point faces the camera (target alpha/beta derived from the world normal direction), then open the existing hotspot info card + trigger its audio (reuse the same components/props `InspectLightbox` passes).
- On unmount: `engine.stopRenderLoop(); scene.dispose(); engine.dispose();` — dispose the full model + textures.

Keep pins/list/card as DOM (React state driven by the per-frame observer writing to refs; use `requestAnimationFrame`-batched `setState` or direct `ref.style` writes for positions to avoid re-render storms — write pin positions/size directly to `el.style` in the observer, mirroring `InspectLightbox`'s imperative transform approach).

- [ ] **Step 4: Add styles**

Create `src/styles/model-360.css` with the overlay, canvas, pin, and drawer rules. Use existing REDA tokens (`var(--reda-*)`) and `rgba()` only — no raw hex (the css test forbids it). Reuse pin styling conventions from the existing hotspot pins.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/viewer/Model360Viewer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run typecheck + suite**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/viewer/Model360Viewer.tsx src/components/viewer/Model360Viewer.test.tsx src/styles/model-360.css
git commit -m "feat: 360 inspect viewer with surface-anchored hotspots"
```

---

### Task 8: Wire the 360 viewer into the exhibition viewer

**Files:**
- Modify: `src/components/viewer/ExhibitionViewer.tsx` (open `Model360Viewer` for MODEL_3D on inspect)
- Modify: `src/components/viewer/FocusPanel.tsx` (label the inspect button "Inspect in 360" for MODEL_3D)
- Test: `src/components/viewer/model3d-inspect-routing.test.ts`

**Interfaces:**
- Consumes: `Model360Viewer` (Task 7), the existing `inspectedArtwork` state + inspect handlers in `ExhibitionViewer`.
- Produces: an `is3DModel(artwork)` guard and conditional rendering: `MODEL_3D` inspect renders `Model360Viewer`; other types keep `InspectLightbox`.

- [ ] **Step 1: Write the failing test**

Create `src/components/viewer/model3d-inspect-routing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { is3DModel } from './model3d-inspect-routing';

describe('is3DModel', () => {
  it('true only for MODEL_3D artworks', () => {
    expect(is3DModel({ artwork_type: 'MODEL_3D' } as any)).toBe(true);
    expect(is3DModel({ artwork_type: 'IMAGE_2D' } as any)).toBe(false);
    expect(is3DModel(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/viewer/model3d-inspect-routing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the guard**

Create `src/components/viewer/model3d-inspect-routing.ts`:

```ts
import type { Artwork } from '../../types/schema';

export function is3DModel(artwork: Pick<Artwork, 'artwork_type'> | null): boolean {
  return artwork?.artwork_type === 'MODEL_3D';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/viewer/model3d-inspect-routing.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the viewer conditionally**

In `src/components/viewer/ExhibitionViewer.tsx`, where `inspectedArtwork` currently renders `<InspectLightbox>`, branch:

```tsx
{inspectedArtwork && (
  is3DModel(inspectedArtwork)
    ? <Model360Viewer
        artwork={inspectedArtwork}
        hotspots={inspectedHotspots}
        onClose={() => setInspectedArtwork(null)}
      />
    : <InspectLightbox /* existing props */ />
)}
```

Import `Model360Viewer` and `is3DModel`. In `src/components/viewer/FocusPanel.tsx`, when the focused artwork `is3DModel`, label the inspect action "Inspect in 360" (otherwise keep "Inspect Full Resolution"). The existing focus→inspect handler already sets `inspectedArtwork` + `inspectedHotspots`; no new wiring is needed.

- [ ] **Step 6: Run typecheck + full suite + build**

Run: `npx tsc -b --noEmit && npx vitest run && npx vite build`
Expected: PASS, clean build.

- [ ] **Step 7: Commit**

```bash
git add src/components/viewer/ExhibitionViewer.tsx src/components/viewer/FocusPanel.tsx src/components/viewer/model3d-inspect-routing.ts src/components/viewer/model3d-inspect-routing.test.ts
git commit -m "feat: route MODEL_3D inspect to the 360 viewer"
```

---

### Task 9: Apply the migration remotely

**Files:** none (deployment step)

- [ ] **Step 1: Apply the D1 migration to the remote database**

Run: `pnpm wrangler d1 migrations apply reda-database --remote`
Expected: `0008_model_3d.sql` applied successfully.

- [ ] **Step 2: Manual end-to-end verification (documented in the PR)**

Verify in a real browser: upload a `.glb` in Studio → proxy generates and the artwork saves; the proxy appears on a pedestal in roam; focusing shows "Inspect in 360"; the 360 viewer loads the full model, orbits, and hotspots (added via the 3D editor) auto-rotate-to-front on click, hide when behind, and scale with zoom.

---

## Self-Review

**Spec coverage:**
- §2 data model → Task 1. §3.1 upload/auto-proxy → Task 5. §3.2 decimation → Task 2. §3.3 placement → reuses existing gizmo (no task needed; noted in Task 5). §3.4 3D hotspot editor → Task 6. §4.1 roam → Task 4. §4.2 360 viewer → Task 7. §4.3 hotspots in viewer (projection/occlusion/zoom-scale/auto-rotate) → Task 3 (math) + Task 7 (integration). §5 performance (proxy-only roam, dispose on close) → Tasks 4 & 7. §6 component breakdown → one task per unit. §8 dependency → Task 2. Migration deploy → Task 9. No gaps.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". UI tasks (5, 6, 7) give concrete code for the novel logic and exact wiring instructions; the reused form/card/audio components are referenced by their existing names.

**Type consistency:** `decimateGlb(ArrayBuffer, opts) → Uint8Array` (Task 2) consumed by `generateAndUploadProxy` (Task 5). `serializeAnchor`/`parseAnchor` (Task 6) produce/consume the same `{p,n}` shape stored by Task 1 and read by Task 7. `pinScaleForRadius`/`isPointFacingCamera` signatures (Task 3) match their Task 7 call sites. `resolveModelProxyUrl`/`createModel3DArtwork` (Task 4) match the factory switch. `is3DModel` (Task 8) used in `ExhibitionViewer` + `FocusPanel`.

**Note on WebGL testing:** the codebase does not unit-test Babylon rendering (no NullEngine). This plan extracts all testable logic into pure modules (Tasks 2, 3, 4-helper, 5-helper, 6-helper, 8-guard) with real tests, and covers the WebGL/React shells with render smoke tests (Task 7) plus the documented manual E2E (Task 9) — matching existing project practice.
