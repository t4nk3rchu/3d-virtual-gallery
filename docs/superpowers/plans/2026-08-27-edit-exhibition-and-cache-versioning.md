# Edit Exhibition, Media Cache Versioning & KTX2 Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let curators edit an existing exhibition's details (and swap its room), make the media proxy cache version-aware so recreating a room never serves stale bytes, and remove the half-wired KTX2 decoder (deferring it to phase 2) while keeping Draco.

**Architecture:** Three independent changes to the existing Vite-SPA + Cloudflare-Worker app. (1) The Worker media proxy gains a `?v=` version segment in its cache key; the client appends a version token (room `created_at` for GLBs, artwork `updated_at` for audio) so a newly-created room or edited artwork gets a fresh cache entry even if the Google Drive fileId is reused. (2) A new exhibition-edit form drives the already-existing `PUT /api/exhibitions/:id`, hardened with a column whitelist. (3) KTX2 decoder config is deleted from the Babylon engine; Draco stays.

**Tech Stack:** TypeScript, React 19, Babylon.js 7, Cloudflare Workers + D1, Vitest, wrangler.

## Global Constraints

- **Package manager:** `pnpm` (v11). Run tests with `pnpm test` (`vitest run`); build with `pnpm build` (`tsc -b && vite build`).
- **IDs:** `crypto.randomUUID()` TEXT primary keys. Timestamps: unix epoch seconds (`Math.floor(Date.now()/1000)`).
- **D1 access:** parameterized prepared statements only. **Column names in dynamic `UPDATE` must come from a fixed whitelist — never from request keys.**
- **Media chokepoints:** image URLs go through `getImageUrl` (Google CDN, not the proxy); proxy-served assets (GLB + audio) must go through the new `proxyMediaUrl` helper. No inline `/api/media/...` template strings after Task 4.
- **Slug is immutable after creation** (protects shared links + cache keys). The edit form must never send `slug`.
- **Definition of done for every task:** `pnpm build` exits 0 AND `pnpm test` is green — not just tests.

---

### Task 1: Remove KTX2 decoder config (keep Draco), defer to phase 2

**Files:**
- Modify: `src/lib/babylon/engine.ts` (remove `KhronosTextureContainer2` import + its `URLConfig` block; keep `DracoCompression`)
- Modify: `docs/FUTURE_PLAN.md` (add KTX2 texture compression to the roadmap)

**Interfaces:**
- Consumes: nothing.
- Produces: `configureSelfHostedDecoders()` now configures Draco only.

- [ ] **Step 1: Remove the KTX2 import**

In `src/lib/babylon/engine.ts`, delete this line:

```ts
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
```

- [ ] **Step 2: Remove the KTX2 URLConfig block**

In `configureSelfHostedDecoders()`, delete the entire `KhronosTextureContainer2.URLConfig = { ... };` assignment (the block referencing `uastc_to_*`, `zstddec`, `basis_transcoder`, `msc_*`). Leave the `DracoCompression.Configuration = { ... };` block exactly as-is. The function body should end up as:

```ts
function configureSelfHostedDecoders(): void {
  DracoCompression.Configuration = {
    decoder: {
      wasmUrl: '/decoders/draco_wasm_wrapper_gltf.js',
      wasmBinaryUrl: '/decoders/draco_decoder_gltf.wasm',
      fallbackUrl: '/decoders/draco_decoder_gltf.js',
    },
  };
}
```

- [ ] **Step 3: Verify no KTX2 references remain**

Run: `grep -rn "KhronosTextureContainer2\|uastc\|basis_transcoder\|zstddec" src/`
Expected: no matches.

- [ ] **Step 4: Add KTX2 to the future plan**

In `docs/FUTURE_PLAN.md`, under `## 1. 🗿 3D Sculpture & Volumetric Asset Pipeline`, add this bullet:

```markdown
- **KTX2 / Basis GPU Texture Compression**: Deferred from phase 1 (rooms were simple and artwork images are CDN-served, so KTX2 added authoring burden for no measurable win). Re-introduce when curators bring heavy custom rooms (photogrammetry / high-res baked-lighting textures) and mobile GPU VRAM becomes a measured bottleneck. Requires self-hosting the `uastc_to_*` / `zstddec` / `basis_transcoder` decoder assets in `public/decoders/` and restoring `KhronosTextureContainer2.URLConfig` in `engine.ts`. Draco geometry compression remains enabled in phase 1.
```

- [ ] **Step 5: Verify build + tests still pass**

Run: `pnpm build && pnpm test`
Expected: build exits 0; all tests pass (Draco-only decoder config still valid).

- [ ] **Step 6: Commit**

```bash
git add src/lib/babylon/engine.ts docs/FUTURE_PLAN.md
git commit -m "chore(3d): drop half-wired KTX2 decoder config, defer to phase 2; keep Draco"
```

---

### Task 2: Version-aware media proxy cache key

**Files:**
- Modify: `worker/media-proxy.ts` (`cacheKey`, `handleMediaProxy`, `warmCache`)
- Test: `worker/media-proxy.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `cacheKey(fileId: string, version?: string): Request` — key URL is `https://media/${fileId}` or `https://media/${fileId}?v=${version}`.
  - `handleMediaProxy(req: Request, ctx: ExecutionContext)` — unchanged signature; now reads `?v=` from `req.url` and threads it into the cache key.
  - `warmCache(fileId: string, ctx: ExecutionContext, version?: string): Promise<void>` — new optional `version` param.

- [ ] **Step 1: Write the failing test**

Add to `worker/media-proxy.test.ts` (reuse the existing `fakeCache`/upstream-mock setup in that file — follow the pattern already there for building a fake `caches.default` and stubbing `fetch`):

```ts
it('uses a version-specific cache key so different versions do not collide', async () => {
  // fakeCache.match returns undefined (miss) for both; assert two distinct keys were put
  const ctx = makeCtx();
  const reqV1 = new Request('https://w/api/media/abc123?v=100');
  const reqV2 = new Request('https://w/api/media/abc123?v=200');

  await handleMediaProxy(reqV1, ctx);
  await handleMediaProxy(reqV2, ctx);
  await ctx.settle(); // await queued waitUntil puts (see existing helper)

  const putKeys = fakeCache.put.mock.calls.map((c) => (c[0] as Request).url);
  expect(putKeys).toContain('https://media/abc123?v=100');
  expect(putKeys).toContain('https://media/abc123?v=200');
});
```

(If the existing test file lacks `makeCtx`/`ctx.settle` helpers, add a minimal `ExecutionContext` fake whose `waitUntil` pushes promises to an array and whose `settle()` awaits them — mirror whatever the current warm-cache test uses.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run worker/media-proxy.test.ts -t "version-specific"`
Expected: FAIL — current `cacheKey` ignores `?v=`, so both puts use `https://media/abc123`.

- [ ] **Step 3: Make the cache key version-aware**

In `worker/media-proxy.ts`, replace `cacheKey`:

```ts
// Range-agnostic cache key. Version (?v=) segments the key so a recreated room
// (new created_at) or edited artwork (new updated_at) never serves stale bytes,
// even when the Google Drive fileId is reused (overwrite-in-place). Spec §4.1.1.
function cacheKey(fileId: string, version?: string): Request {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return new Request(`https://media/${fileId}${suffix}`);
}
```

In `handleMediaProxy`, after validating `fileId`, read the version and pass it:

```ts
const url = new URL(req.url);
const version = url.searchParams.get('v') ?? undefined;
const cache = caches.default;
const key = cacheKey(fileId, version);
```

(The rest of `handleMediaProxy` is unchanged — it already uses `key` for `cache.match` and `cache.put`.)

In `warmCache`, add the param and use it:

```ts
export async function warmCache(fileId: string, ctx: ExecutionContext, version?: string): Promise<void> {
  if (!fileId || !FILE_ID_RE.test(fileId)) return;
  const cache = caches.default;
  const key = cacheKey(fileId, version);
  // ...unchanged body...
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run worker/media-proxy.test.ts`
Expected: PASS (new test + all existing proxy tests — the no-version path still keys as `https://media/abc123`).

- [ ] **Step 5: Commit**

```bash
git add worker/media-proxy.ts worker/media-proxy.test.ts
git commit -m "feat(media): version-aware cache key (?v=) to fix stale room/artwork caching"
```

---

### Task 3: Artwork `updated_at` + column-whitelist hardening (DB)

**Files:**
- Create: `migrations/0004_artwork_updated_at.sql`
- Modify: `src/types/schema.ts` (add `updated_at` to `Artwork`)
- Modify: `worker/db.ts` (`createArtworkRecord`, `updateArtworkRecord`, `updateExhibition` — whitelist + set `updated_at`)
- Test: `worker/db.test.ts` (or the existing DB test file)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Artwork.updated_at: number` (unix epoch).
  - `updateExhibition` / `updateArtworkRecord` now ignore any patch key not in a fixed column whitelist.
  - `updateArtworkRecord` stamps `updated_at = now` on every update; `createArtworkRecord` sets it on insert.

- [ ] **Step 1: Write the migration**

Create `migrations/0004_artwork_updated_at.sql`:

```sql
-- Migration 0004: add updated_at to artworks (media cache versioning for audio)
ALTER TABLE artworks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE artworks SET updated_at = strftime('%s','now') WHERE updated_at = 0;
```

- [ ] **Step 2: Write the failing test**

Add to the DB test file (follow the existing in-memory/Miniflare D1 setup used by the current `worker/db.test.ts`):

```ts
it('bumps artwork updated_at on update and ignores non-whitelisted columns', async () => {
  const db = await makeTestDb(); // existing helper that applies all migrations
  const ex = await createExhibitionWithRoom(db); // existing helper or inline create
  const art = await createArtworkRecord(db, {
    exhibition_id: ex.id, title: 'A', artist: 'B', artwork_type: 'IMAGE_2D',
    media_file_id: 'fid', transform_json: '{}', frame_config_json: '{}', order_index: 0,
  } as never);
  const before = art.updated_at;

  // Malicious/unknown key must be ignored, not interpolated into SQL:
  await updateArtworkRecord(db, art.id, ex.id, { title: 'A2', ['id = id; DROP TABLE artworks; --']: 1 } as never);

  const rows = await db.prepare('SELECT title, updated_at FROM artworks WHERE id = ?').bind(art.id).all();
  expect(rows.results[0].title).toBe('A2');
  expect(rows.results[0].updated_at).toBeGreaterThanOrEqual(before);
  // table still exists (injection ignored):
  const count = await db.prepare('SELECT COUNT(*) as n FROM artworks').first();
  expect(count.n).toBe(1);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run worker/db.test.ts -t "updated_at on update"`
Expected: FAIL — `updated_at` undefined / injected column error / table dropped.

- [ ] **Step 4: Add `updated_at` to the Artwork type**

In `src/types/schema.ts`, in `interface Artwork`, add after `order_index`:

```ts
  updated_at: number;   // unix epoch; bumped on every edit (media cache versioning)
```

- [ ] **Step 5: Whitelist columns + stamp updated_at in db.ts**

At the top of `worker/db.ts` add fixed whitelists:

```ts
const EXHIBITION_UPDATE_COLS = new Set([
  'room_id', 'title', 'description', 'curator_name',
  'start_date', 'end_date', 'is_published', 'cover_image_url', 'settings_json',
]); // NOTE: slug and user_id are intentionally NOT updatable
const ARTWORK_UPDATE_COLS = new Set([
  'title', 'artist', 'year', 'medium', 'dimensions', 'description',
  'artwork_type', 'media_file_id', 'youtube_video_id', 'audio_guide_file_id',
  'transform_json', 'frame_config_json', 'order_index',
]);
```

Rewrite `updateExhibition` to filter by the whitelist:

```ts
export async function updateExhibition(
  db: D1Database, id: string, userId: string, patch: Partial<ExhibitionInput>
): Promise<boolean> {
  const entries = Object.entries(patch).filter(([k]) => EXHIBITION_UPDATE_COLS.has(k));
  if (entries.length === 0) return false;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  const result = await db
    .prepare(`UPDATE exhibitions SET ${fields} WHERE id = ? AND user_id = ?`)
    .bind(...values, id, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
```

Rewrite `updateArtworkRecord` to filter by the whitelist AND always stamp `updated_at`:

```ts
export async function updateArtworkRecord(
  db: D1Database, id: string, exhibitionId: string, patch: Record<string, unknown>
): Promise<boolean> {
  const entries = Object.entries(patch).filter(([k]) => ARTWORK_UPDATE_COLS.has(k));
  const now = Math.floor(Date.now() / 1000);
  const setParts = entries.map(([k]) => `${k} = ?`);
  const values = entries.map(([, v]) => v);
  setParts.push('updated_at = ?');
  values.push(now);
  const result = await db
    .prepare(`UPDATE artworks SET ${setParts.join(', ')} WHERE id = ? AND exhibition_id = ?`)
    .bind(...values, id, exhibitionId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
```

In `createArtworkRecord`, add `updated_at` to the INSERT column list and bind `Math.floor(Date.now()/1000)` for it (mirror how `created_at`-style values are bound elsewhere; the INSERT must include the new NOT NULL column).

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run worker/db.test.ts`
Expected: PASS.

- [ ] **Step 7: Apply the migration locally**

Run: `pnpm exec wrangler d1 migrations apply virtual-gallery-db --local`
Expected: `0004_artwork_updated_at.sql` applied.

- [ ] **Step 8: Commit**

```bash
git add migrations/0004_artwork_updated_at.sql src/types/schema.ts worker/db.ts worker/db.test.ts
git commit -m "feat(db): artwork updated_at + column whitelist on updates (fixes SQL-injection via patch keys)"
```

---

### Task 4: Route version tokens into client media URLs

**Files:**
- Modify: `src/lib/media/gdrive.ts` (add `proxyMediaUrl` helper)
- Test: `src/lib/media/gdrive.test.ts`
- Modify: `src/lib/babylon/room-loader.ts` (accept + append version)
- Modify: `src/components/viewer/ExhibitionViewer.tsx`, `src/components/viewer/FocusPanel.tsx`, `src/components/viewer/FallbackCatalog.tsx`, `src/components/viewer/InspectLightbox.tsx`, `src/components/studio/GizmoPlacement.tsx` (use `proxyMediaUrl`)

**Interfaces:**
- Consumes: `Artwork.updated_at` (Task 3), `Room.created_at` (existing).
- Produces: `proxyMediaUrl(fileId: string, version?: string | number): string` → `/api/media/${fileId}` or `/api/media/${fileId}?v=${version}`. `loadGlbRoom(scene, glbFileId, onProgress, version?)`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/media/gdrive.test.ts`:

```ts
import { proxyMediaUrl } from './gdrive';

describe('proxyMediaUrl', () => {
  it('builds a bare proxy url without a version', () => {
    expect(proxyMediaUrl('fid')).toBe('/api/media/fid');
  });
  it('appends a version query param', () => {
    expect(proxyMediaUrl('fid', 1712345678)).toBe('/api/media/fid?v=1712345678');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/media/gdrive.test.ts -t "proxyMediaUrl"`
Expected: FAIL — `proxyMediaUrl` not exported.

- [ ] **Step 3: Add the helper**

In `src/lib/media/gdrive.ts`, add:

```ts
/**
 * Single chokepoint for proxy-served media URLs (GLB + audio).
 * `version` (room.created_at for GLBs, artwork.updated_at for audio) segments
 * the edge cache so recreated rooms / edited artworks never serve stale bytes.
 */
export function proxyMediaUrl(fileId: string, version?: string | number): string {
  const base = `/api/media/${fileId}`;
  return version == null || version === '' ? base : `${base}?v=${version}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/media/gdrive.test.ts`
Expected: PASS.

- [ ] **Step 5: Thread version through the room loader**

In `src/lib/babylon/room-loader.ts`, change the signature and URL build. Current:

```ts
export async function loadGlbRoom(scene, glbFileId, onProgress) {
  const proxyUrl = ...
  const loadUrl = isDirectUrl ? glbFileId : `/api/media/${glbFileId}`;
```

to:

```ts
import { proxyMediaUrl } from '../media/gdrive';
// ...
export async function loadGlbRoom(
  scene: Scene, glbFileId: string, onProgress: (p: LoadProgress) => void, version?: string | number
): Promise<AbstractMesh[]> {
  const isDirectUrl = /^https?:\/\//.test(glbFileId) || glbFileId.startsWith('default-');
  const loadUrl = isDirectUrl ? glbFileId : proxyMediaUrl(glbFileId, version);
```

(Keep the existing direct-URL / `default-` template handling exactly as it currently is — only the proxy branch changes.)

- [ ] **Step 6: Pass room version from the viewer and the studio**

In `src/components/viewer/ExhibitionViewer.tsx`, update the load call:

```ts
await loadGlbRoom(scene, exhibition.room.glb_file_id, (p) => {
  setLoadProgress(Math.round(p.fraction * 100));
}, exhibition.room.created_at);
```

In `src/components/studio/GizmoPlacement.tsx`, update its `loadGlbRoom(scene, room.glb_file_id, () => {})` call to pass `room.created_at` as the 4th arg.

- [ ] **Step 7: Use proxyMediaUrl for all audio URLs**

Replace every inline `` `/api/media/${...}` `` for **audio** with `proxyMediaUrl(fileId, artwork.updated_at)`:
- `src/components/viewer/FocusPanel.tsx` (both `media_file_id` for AUDIO and `audio_guide_file_id`)
- `src/components/viewer/FallbackCatalog.tsx` (audio `media_file_id`, `audio_guide_file_id`)
- `src/components/viewer/InspectLightbox.tsx` (the `/api/media/${fileId}` branch)
- `src/components/viewer/ExhibitionViewer.tsx` (the `onAudioSeek` `const url = \`/api/media/${audioSrc}\`` → `proxyMediaUrl(audioSrc, inspectedArtwork.updated_at)`)

Import `proxyMediaUrl` in each. (Images stay on `getImageUrl` — unchanged.)

- [ ] **Step 8: Warm the versioned keys on publish**

In `worker/routes/crud.ts`, in the publish branch of `handleExhibitionById`, pass versions so the warmed key matches what clients request:

```ts
if (detail.room?.glb_file_id) {
  ctx.waitUntil(warmCache(detail.room.glb_file_id, ctx, String(detail.room.created_at)));
}
for (const art of detail.artworks || []) {
  if (art.media_file_id) ctx.waitUntil(warmCache(art.media_file_id, ctx, String(art.updated_at)));
  if (art.audio_guide_file_id) ctx.waitUntil(warmCache(art.audio_guide_file_id, ctx, String(art.updated_at)));
}
```

- [ ] **Step 9: Verify build + tests**

Run: `pnpm build && pnpm test`
Expected: build exits 0; all tests pass. Then confirm no stray inline proxy URLs remain:
Run: `grep -rn "\`/api/media/" src/` — Expected: no matches (all via `proxyMediaUrl`).

- [ ] **Step 10: Commit**

```bash
git add src/lib/media/gdrive.ts src/lib/media/gdrive.test.ts src/lib/babylon/room-loader.ts src/components/viewer/ src/components/studio/GizmoPlacement.tsx worker/routes/crud.ts
git commit -m "feat(media): route room/artwork version tokens through proxyMediaUrl + warm versioned keys"
```

---

### Task 5: Edit-exhibition backend (metadata + room swap, slug immutable)

**Files:**
- Modify: `worker/routes/crud.ts` (`handleExhibitionById` PUT — validate room-swap ownership; strip slug)
- Test: `worker/routes/crud.test.ts` (create it if absent; follow the Miniflare pattern from `worker/db.test.ts`)

**Interfaces:**
- Consumes: `updateExhibition` (whitelisted, Task 3), `getExhibitionById`, `getRoomsForUser`.
- Produces: `PUT /api/exhibitions/:id` accepts `{ title?, description?, curator_name?, start_date?, end_date?, cover_image_url?, settings_json?, room_id?, is_published? }`; ignores `slug`/`user_id`; rejects a `room_id` the caller may not use (not owner and not public) with 403.

- [ ] **Step 1: Write the failing test**

```ts
it('edits exhibition metadata but never the slug', async () => {
  const { req, env, auth, ex } = await setupOwnedExhibition(); // helper: owner + published-capable exhibition
  const res = await handleExhibitionById(
    putReq({ title: 'New Title', slug: 'hacked-slug', description: 'D' }),
    env, auth, ex.id, fakeCtx()
  );
  expect(res.status).toBe(200);
  const row = await env.DB.prepare('SELECT title, slug FROM exhibitions WHERE id = ?').bind(ex.id).first();
  expect(row.title).toBe('New Title');
  expect(row.slug).toBe(ex.slug); // unchanged
});

it('rejects swapping to a room the caller cannot use', async () => {
  const { env, auth, ex } = await setupOwnedExhibition();
  const otherRoom = await createRoom(env.DB, { owner_user_id: 'someone-else', name: 'X', glb_file_id: 'g',
    glb_source: 'curator_drive', description: null, thumbnail_url: null, spawn_json: null, is_public: 0 } as never);
  const res = await handleExhibitionById(putReq({ room_id: otherRoom.id }), env, auth, ex.id, fakeCtx());
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run worker/routes/crud.test.ts`
Expected: FAIL — slug currently passes through updateExhibition’s old code path / room-swap unchecked. (After Task 3 slug is already ignored by the whitelist; this test locks that behavior in AND adds the missing room-swap ownership check, which does not exist yet → the second test fails.)

- [ ] **Step 3: Add the room-swap ownership guard**

In `handleExhibitionById`, in the `PUT` branch, before calling `updateExhibition`, add:

```ts
if (typeof patch.room_id === 'string') {
  const rooms = await getRoomsForUser(env.DB, auth.sub); // returns owned + public rooms
  if (!rooms.some((r) => r.id === patch.room_id)) {
    return json({ error: 'Room not found or not accessible' }, 403);
  }
}
```

(`slug` and `user_id` are already dropped by `updateExhibition`’s whitelist from Task 3 — no extra code needed, but confirm `getRoomsForUser` returns public rooms too; if it only returns owned rooms, extend its query with `OR is_public = 1` so curators can attach a platform library room.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run worker/routes/crud.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify build + full suite**

Run: `pnpm build && pnpm test`
Expected: build 0; all green.

- [ ] **Step 6: Commit**

```bash
git add worker/routes/crud.ts worker/routes/crud.test.ts worker/db.ts
git commit -m "feat(api): edit-exhibition PUT with room-swap ownership check; slug immutable"
```

---

### Task 6: Edit-exhibition form (Studio UI)

**Files:**
- Create: `src/lib/studio/exhibition-patch.ts` (pure patch builder)
- Test: `src/lib/studio/studio.test.ts` (add cases)
- Modify: `src/components/studio/StudioApp.tsx` (`ExhibitionEditor` — add the edit form + room dropdown)

**Interfaces:**
- Consumes: `PUT /api/exhibitions/:id` (Task 5), `GET /api/rooms`.
- Produces: `buildExhibitionPatch(form): Record<string, unknown>` — drops `slug`, drops empty-string/undefined fields, keeps `room_id` when set.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/studio/studio.test.ts`:

```ts
import { buildExhibitionPatch } from './exhibition-patch';

describe('buildExhibitionPatch', () => {
  it('omits slug and empty fields, keeps set values', () => {
    const patch = buildExhibitionPatch({
      title: 'T', slug: 'should-be-dropped', description: '', curator_name: 'C', room_id: 'r1',
    });
    expect(patch).toEqual({ title: 'T', curator_name: 'C', room_id: 'r1' });
    expect('slug' in patch).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/studio/studio.test.ts -t "buildExhibitionPatch"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the patch builder**

Create `src/lib/studio/exhibition-patch.ts`:

```ts
export interface ExhibitionEditForm {
  title?: string;
  description?: string;
  curator_name?: string;
  start_date?: string;
  end_date?: string;
  cover_image_url?: string;
  room_id?: string;
}

const EDITABLE_KEYS: (keyof ExhibitionEditForm)[] = [
  'title', 'description', 'curator_name', 'start_date', 'end_date', 'cover_image_url', 'room_id',
];

/** Build the PUT patch: only editable keys, dropping undefined/empty strings. Slug is never editable. */
export function buildExhibitionPatch(form: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_KEYS) {
    const v = form[k];
    if (v !== undefined && v !== '') patch[k] = v;
  }
  return patch;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/studio/studio.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the edit form to ExhibitionEditor**

In `src/components/studio/StudioApp.tsx`, inside `ExhibitionEditor` (which already loads `exhibition` and renders the header + `ArtworkManager`), add an "Edit details" section that:
- Holds local state seeded from `exhibition` (title, description, curator_name, start_date, end_date, cover_image_url, room_id).
- Fetches rooms once (`fetch('/api/rooms', { credentials:'include' }).then(r => r.json())`) for a `<select>` room-swap dropdown showing `room.name`.
- Renders `slug` as read-only text (e.g. `<p>URL: /e/{exhibition.slug} (permanent)</p>`).
- On Save, calls:

```tsx
const patch = buildExhibitionPatch(form);
const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(patch),
});
if (res.ok) { setStatus('Saved.'); /* re-fetch exhibition detail to refresh */ }
else { setStatus(await res.text()); }
```

Import `buildExhibitionPatch` from `../../lib/studio/exhibition-patch`. Keep the existing Publish button and `ArtworkManager` as-is.

- [ ] **Step 6: Verify build + tests, then manual smoke**

Run: `pnpm build && pnpm test`
Expected: build 0; all green.
Manual (dev server): open `/studio`, edit an exhibition's title + swap its room + Save → reload → changes persist; confirm the slug field is not editable and the public `/e/{slug}` still resolves.

- [ ] **Step 7: Commit**

```bash
git add src/lib/studio/exhibition-patch.ts src/lib/studio/studio.test.ts src/components/studio/StudioApp.tsx
git commit -m "feat(studio): edit existing exhibition (metadata + room swap); slug shown read-only"
```

---

## Self-Review

**Spec coverage (the three requested items):**
1. *Drop KTX2, add to future plan* → Task 1. ✅
2. *Fix replace-room cache versioning* → Tasks 2 (version-aware key) + 4 (client passes `room.created_at`; a recreated room = new `created_at` = fresh key, matching the "create new room + delete old" workflow) + Task 4 Step 8 (warm the versioned key). ✅
3. *Edit existing exhibition* → Task 5 (backend, incl. room swap, slug immutable) + Task 6 (UI). ✅
   Bonus surfaced during reading: column-whitelist SQL-injection fix folded into Task 3 (the edit path depends on it). ✅

**Placeholder scan:** every code step shows real code; migration, whitelists, helper, and form wiring are concrete. Test helpers reference existing patterns in the repo (`worker/db.test.ts`, `worker/media-proxy.test.ts`) rather than inventing a framework.

**Type consistency:** `proxyMediaUrl(fileId, version?)` used identically in room-loader, viewer, studio; `Artwork.updated_at` added in Task 3 and consumed in Task 4; `updateExhibition`/`updateArtworkRecord` whitelist names match the actual columns in `migrations/0001_init.sql`; `getRoomsForUser` reused for the room-swap guard (Task 5 notes the `OR is_public = 1` extension if it isn't already returning public rooms).

**Known follow-up (not in scope):** audio-file overwrite-in-place is now bustable only when the artwork is edited (updated_at bumps). Room GLB is fully covered because recreating a room always yields a new `created_at`. This matches the stated workflow (no room-edit; recreate to change).
```
