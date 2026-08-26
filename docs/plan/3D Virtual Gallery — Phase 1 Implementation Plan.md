# 3D Virtual Gallery — Phase 1 Implementation Plan

**Supersedes:** `3D Virtual Gallery & Exhibition Platform — Complete Implementation Plan.md`
**Spec:** `docs/spec/3D Virtual Gallery — Design Specification v2.md`
**Status:** re-scoped phase 1 (see `docs/REVIEW.md`)

**Stack:** Vite + React (SPA, TypeScript) · Babylon.js 7+ · Cloudflare Pages (client) + one Cloudflare Worker (API) · D1 (app data) · Workers Analytics Engine (events) · Google Drive + image CDN + YouTube.

---

## Why this plan exists (read this first)

The original implementation plan was reviewed against the actual product requirements and found to be **over-scoped, stack-mismatched, and carrying several load-bearing bugs** that would have caused failures under real visitor load. This plan is the result of that review. Concretely:

### Stack correction: Next.js → Vite SPA + Workers

> **Why cut:** The product is a client-side WebGL SPA with a handful of JSON endpoints. Next.js / `next-on-pages` adds SSR/RSC machinery that creates edge-runtime friction and provides no benefit — there is no SEO requirement (exhibitions are shared by direct link) and no server-rendered HTML to deliver. A plain Vite SPA + one Cloudflare Worker is a direct fit for the job.

### Cut scope — why each feature was deferred

The following items appear in the original plan or spec but are **explicitly not built in phase 1**, for the reasons stated.

| Feature | Reason cut |
|---|---|
| **Automated guided tour** | Never requested by the product owner. What *is* wanted — click-to-focus navigation — is a different mechanism (pointer picking → `focusOnArtwork`), which is built in Task 8. |
| **Password-gated exhibitions** | A post-launch access-control feature; the launch requirement is draft vs published only. Adding `password_hash` to exhibitions now would be dead schema. |
| **Parametric in-browser room builder** (floor-plan editor, wall drawing, CSG doorways, material/lighting inspectors, template authoring UI) | Roughly 30–40 % of the original build effort, and entirely off the critical path. Phase 1 curators import a GLB; the browser builder can follow once the core platform is proven. |
| **Mini-map** | Would require reading parametric wall geometry that GLB rooms do not expose. Needs redesign before it is implementable; that redesign belongs in phase 2 alongside the room builder. |
| **3D sculpture artworks** | A nice-to-have that adds significant 3D asset-pipeline complexity. Phase 1 covers the three requested types: 2D image, video (YouTube), and audio. |
| **Next.js** | See stack correction above. |
| **Deep analytics dashboards** (time-series, unique-visitor dedup, funnels, export) | Medium-depth engagement tracking (per-artwork views, focus/inspect counts, mean dwell) ships in phase 1. The richer dashboard is a phase 2 addition once real traffic gives the curator something meaningful to look at. |

### Bugs fixed vs v1

Five correctness bugs were identified in the v1 plan. Each would have broken the product in production; they are all addressed in this plan.

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | **Edge cache never populated** — the media proxy set a `Cache-Control` header but never called the Cloudflare Cache API (`caches.default.match/put`). Setting the header alone does not cache a Worker subrequest. | At 100 concurrent visitors, Drive would serve every request cold and quickly 403 on opening night. The cache is the entire reason Drive survives real load. | Task 1: explicit `cache.match` + `cache.put` via `ctx.waitUntil`. |
| 2 | **Drive interstitial not handled** — `uc?export=download` returns an HTML virus-scan page for files above Drive's size threshold. The v1 proxy would have cached that HTML *as* the room GLB. | The curator's room model would never load; visitors would get a corrupt response, silently. | Task 1: detect HTML content-type / confirm token; re-fetch with `&confirm=<token>`; never cache HTML. |
| 3 | **Range requests mishandled** — the proxy forwarded `Range` but returned the upstream status code blindly, risking caching a `206` partial as a complete response. | Audio seeking breaks; the cached partial would be served as the full file on all future requests. | Task 1: cache only full `200` responses; serve range slices from the cached complete body. |
| 4 | **Undocumented image CDN path** — `lh3.googleusercontent.com/d/{id}` is not a documented API and has broken in the past. | Image URLs silently break across the whole platform with no easy migration path. | Task 3: wrap image URL generation in a single helper (`getImageUrl`) so the CDN can be swapped for a Worker proxy in one file edit. |
| 5 | **bcrypt/Argon2 on Workers** — native-addon hash libraries do not run in the Workers runtime. | Password registration/login crashes at runtime with a module-load error. | Task 4: use `WebCrypto.subtle` with PBKDF2 only. |

Two additional spec-vs-plan gaps were identified where the original plan declared features but never actually wired them:

| Gap | Detail | Fixed in |
|---|---|---|
| **Resolution scaler was dead code** | Built and tested, but never called from the interaction flow. Switching states had no visual effect. | Task 6 + Task 8 |
| **No click handling in the viewer** | No `onPointerObservable` setup, so click-to-focus and click-to-inspect could never fire. The entire three-state interaction model was missing its trigger. | Task 8 |
| **`artwork-factory` only handled 2D images** | Video and audio artwork paths were unimplemented despite being in the spec. | Task 7 |
| **No production D1 accessor** | Only a Node `better-sqlite3` test shim existed; nothing obtained the real D1 binding at runtime. | Task 2 |

Additionally, one quality issue:

- **IDs via `Date.now()+Math.random()`** → replaced with `crypto.randomUUID()` (available at edge, collision-safe). Noted in Global Constraints below.

---

## Global constraints

- **All D1 access:** parameterized prepared statements. IDs via `crypto.randomUUID()`.

  > **Why `crypto.randomUUID()`:** `Date.now()+Math.random()` is neither collision-safe nor a valid UUID; `crypto.randomUUID()` is available in all Workers / browser runtimes and generates a properly random 128-bit ID.

- **Passwords:** PBKDF2 via WebCrypto only (no bcrypt/Argon2 — no native addons on Workers).

  > **Why PBKDF2:** bcrypt and Argon2 rely on native C extensions. The Cloudflare Workers runtime is a V8 isolate — there are no native addons. Importing either library would crash at module load. WebCrypto's `subtle.deriveBits` / `subtle.deriveKey` with PBKDF2-SHA256 is the correct choice: it ships in the runtime, is hardware-accelerated, and is standards-compliant.

- **Resolution tiers:** WALK `setHardwareScalingLevel(1/0.75)` → FOCUS `1/0.9` → POPUP `1.0`, **wired to interaction state** (§ Task 8).

  > **Why explicitly called out:** v1 implemented the scaler correctly but never called it from the interaction handlers, making it dead code. The constraint forces Task 8 to close that loop.

- **Camera:** `UniversalCamera`, eye height `y=1.7`, ellipsoid `(0.5,0.9,0.5)`, collisions on.
- **Media:** images direct from `lh3.googleusercontent.com` CDN; video via YouTube; audio + room GLB via the **edge-cached Worker proxy** (Task 1).
- **No test theater:** every test must be able to fail for a real reason.

  > **Why no test theater:** the v1 plan applied TDD ceremony to trivial parts (asserting a function *exists*, re-testing an already-covered helper) while genuinely risky logic — proxy caching, Range handling, camera collision — had no runnable tests at all. This constraint reverses that priority.

## Build order rationale

Highest-risk, load-bearing work goes first. The media proxy (Task 1) is the single thing the whole cost/scale model depends on and was broken in v1 — prove it before anything else. Then foundations (scaffold, types, DB), then API, then the 3D viewer, then CMS, then analytics and fallback.

> **Why this order matters:** the review identified that the most critical bugs live in the media proxy and auth layers — the lowest-level pieces. Discovering them after the viewer and CMS are built would require a costly retrofit. Building proxy-first means every subsequent task is built on a proved foundation, and the riskiest integration (Cache API + Drive interstitial + Range) is exercised earliest.

---

## Task 1 — Media proxy: Cache API + Drive interstitial + Range  ⚠️ highest risk, do first

**Why first:** at 100 concurrent visitors this is the only thing shielding Google Drive. v1 never called the Cache API, so nothing was cached. De-risk it before building on top.

> **Bug context (bugs #1, #2, #3):** All three of the most critical v1 bugs live here:
> - *Bug #1* — `Cache-Control` header set but `caches.default.put` never called → zero caching.
> - *Bug #2* — Drive returns HTML for large files; v1 would have cached that HTML as the model.
> - *Bug #3* — Range forwarded upstream but `206` partials risked being stored as complete files, breaking audio seeking.
>
> All three are fixed in this single task. Until this task passes, the platform cannot handle real visitor load.

**Files:** `worker/media-proxy.ts`, `worker/media-proxy.test.ts`

**Produces:** `handleMediaProxy(request, env, ctx)` — validates `fileId`, serves from `caches.default`, fetches Drive on miss (following the virus-scan `confirm=` interstitial for large files), caches only full `200` responses, serves `Range` slices from the cached full asset, sets immutable Cache-Control + CORS.

1. **Failing tests** (mock upstream `fetch` + a fake `caches.default`):
   - miss → fetches upstream, calls `cache.put`, returns 200 body.
   - hit → returns cached body without upstream fetch.
   - upstream returns HTML interstitial with a confirm token → proxy re-fetches with `&confirm=<token>` and returns the real bytes (never caches the HTML).
   - request with `Range: bytes=0-99` → returns `206` with the correct 100-byte slice and `Content-Range`.
   - invalid `fileId` (`../`, spaces) → `400`.
   - `warmCache(fileId, env, ctx)` populates the cache so a subsequent request is a hit without upstream fetch (used at publish time — spec §4.1 #6).
2. Run → FAIL.
3. Implement. Key skeleton:
   ```ts
   export async function handleMediaProxy(req: Request, env: Env, ctx: ExecutionContext) {
     const fileId = new URL(req.url).pathname.split('/').pop() ?? '';
     if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) return new Response('bad id', { status: 400 });

     const cache = caches.default;
     const cacheKey = new Request(`https://media/${fileId}`); // range-agnostic key
     let full = await cache.match(cacheKey);
     if (!full) {
       full = await fetchDriveFollowingInterstitial(fileId); // handles &confirm=
       if (full.ok && full.status === 200) {
         const toCache = new Response(full.clone().body, full);
         toCache.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
         ctx.waitUntil(cache.put(cacheKey, toCache));
       }
     }
     const range = req.headers.get('Range');
     return range ? sliceRange(full, range) : withCors(full);
   }
   ```
   `fetchDriveFollowingInterstitial`: GET `uc?export=download&id=`; if response is `text/html`, parse the `confirm` token and re-GET with it. `sliceRange`: read the cached full body, return the requested byte range as `206` + `Content-Range`/`Accept-Ranges`.

   > **Range design note:** the cache key is range-agnostic (`https://media/{fileId}`) so a range request does not create a separate cache entry for each byte range. The full body is always stored; range slices are computed from it in memory. This avoids the `206`-stored-as-`200` bug and means any subsequent range request is also a cache hit.

4. Run → PASS.
5. Commit: `feat(media): edge-cached Drive proxy with interstitial + Range support`.

---

## Task 2 — Project scaffold, domain types, D1 schema

**Files:** `package.json`, `vite.config.ts`, `wrangler.toml`, `src/types/schema.ts`, `migrations/0001_init.sql`, `worker/db.ts`, `worker/db.test.ts`

**Produces:** Vite+React app, Worker entry, D1 binding, TS domain types (`User`, `Room`, `Exhibition`, `Artwork`, `ArtworkHotspot`, and `*Input` variants), migration matching spec §3, `getExhibitionBySlug`, `createExhibition`.

1. Failing test: create + fetch exhibition by slug (against Miniflare D1, **not** `better-sqlite3` — the real binding).

   > **Why Miniflare, not `better-sqlite3`:** v1 used a Node `better-sqlite3` shim for tests but never wired the real D1 binding for production. The shim hid that D1's prepared-statement API differs subtly from SQLite's Node bindings. Testing against Miniflare's D1 emulation catches real binding issues and eliminates the gap between tests and production.

2. Run → FAIL.
3. Implement types (spec §3), migration (all tables + indexes, no `tour_waypoints`, no exhibition `password_hash`), and D1 helpers using prepared statements. `wrangler.toml` declares D1 + Analytics Engine bindings.

   > **Why no `tour_waypoints` table:** the guided tour was cut entirely (see scope section). `tour_waypoints` would be dead schema adding migration noise and cognitive load. It can be added in phase 2 if a tour feature is actually requested.
   >
   > **Why no `password_hash` on exhibitions:** password-gated exhibitions are phase 2. The column would be dead at launch and its presence would invite confusion about whether it does anything.

4. Run → PASS.
5. Commit: `chore: scaffold vite+worker, add D1 schema and domain types`

> Note vs v1: no `TourWaypoint`, no parametric room fields, no `better-sqlite3` Node shim.

---

## Task 3 — Drive & YouTube resolvers

**Files:** `src/lib/media/gdrive.ts`, `src/lib/media/youtube.ts`, tests

**Produces:** `extractGoogleDriveFileId(url)`, `getImageUrl(fileId, 'thumbnail'|'gallery'|'original')`, `parseYouTubeVideoId(url)`.

1. Failing tests: fileId extraction across sharing formats + bare id; image URL tiers (`=w400`/`=w1600`/`=s0`); YouTube id from `watch?v=`, `youtu.be`, bare id, and `null` for junk.
2. FAIL → implement → PASS.
3. Keep `getImageUrl` the single chokepoint so the undocumented CDN can be swapped for a proxy in one edit (spec §4.2).

   > **Why the single-chokepoint rule (bug #4):** `lh3.googleusercontent.com/d/{fileId}` is undocumented and has broken before. If every component constructs image URLs inline, a CDN break requires touching every component. With a single helper, the fallback (routing images through the Worker proxy) is a one-file change with no caller changes.

4. Commit: `feat(media): Drive fileId + image tiers, YouTube parser`.

---

## Task 4 — Auth: Google OAuth + password fallback + JWT

**Files:** `worker/auth.ts`, `worker/crypto.ts` (PBKDF2), `worker/jwt.ts`, tests

**Produces:** OAuth start/callback handlers, `registerPassword`/`loginPassword`, `hashPassword`/`verifyPassword` (WebCrypto PBKDF2), `signJwt`/`verifyJwt`, `requireAuth(req)` middleware, HTTP-only cookie issuance.

> **Why this task exists at all:** v1 had a `users` table in the schema but no auth implementation whatsoever. The curator CMS, CRUD ownership checks, and Drive picker OAuth grant all require a working auth layer. This is not optional infrastructure.
>
> **Why PBKDF2, not bcrypt/Argon2 (bug #5):** See Global Constraints. Argon2 / bcrypt are native-addon libraries; they crash at import in a V8 isolate. `WebCrypto.subtle.deriveKey` with PBKDF2-SHA256 is the correct, runtime-safe password KDF for Workers.

1. Failing tests: PBKDF2 hash≠plaintext and verify round-trips; JWT sign→verify round-trips and rejects tampered tokens; `requireAuth` rejects missing/invalid cookie.
2. FAIL → implement. OAuth callback upserts a `users` row keyed by `google_sub`; password path stores `password_hash`.
3. PASS.
4. Commit: `feat(auth): google oauth + pbkdf2 password fallback + jwt cookies`.

---

## Task 5 — CRUD API (exhibitions, rooms, artworks, hotspots)

**Files:** `worker/routes/*.ts`, `worker/index.ts` (router), tests

**Produces:** the routes in spec §7 with ownership enforcement; public `by-slug` returns published-only unless the caller owns it.

> **Why ownership enforcement is tested explicitly:** a missing ownership check on a mutation route is a silent authorization bug — the product stores real curator work. Testing that non-owners receive `403` and that drafts are hidden from the public endpoint is not paranoia; it is the minimum correctness bar for a multi-tenant platform.

1. Failing tests: owner can CRUD own exhibition; non-owner gets 403; `by-slug` hides drafts from the public; artwork/hotspot writes are scoped to an owned parent.
2. FAIL → implement router + handlers (prepared statements, `requireAuth` on mutations).
3. PASS.
4. Commit: `feat(api): exhibitions/rooms/artworks/hotspots crud with ownership checks`.

---

## Task 6 — Babylon engine lifecycle + resolution scaler

**Files:** `src/lib/babylon/engine.ts`, `src/lib/babylon/resolution-scaler.ts`, `resolution-scaler.test.ts`

**Produces:** `initScene(canvas)` → `{ engine, scene, scaler, dispose }` with hemispheric light + FXAA pipeline; `ResolutionScaler.setTier('WALK'|'FOCUS'|'POPUP')`.

> **Why the scaler is its own task (gap fix — dead code):** v1 implemented the scaler correctly (the tier math was right) but it was never called from anywhere in the interaction layer. Isolating it in its own task with its own tests means the scaler is independently verified before Task 8 wires it to clicks. When Task 8 calls `scaler.setTier(...)`, the behavior is already proven.

1. Failing test: each tier calls `setHardwareScalingLevel` with `1/0.75`, `1/0.9`, `1.0`.
2. FAIL → implement.
3. PASS.
4. Commit: `feat(3d): scene lifecycle and 3-tier resolution scaler`.

> The scaler is wired to interaction in Task 8 — it must not stay dead code as in v1.

---

## Task 7 — Room GLB loader + artwork factory (image / video / audio)

**Files:** `src/lib/babylon/room-loader.ts`, `src/lib/babylon/artwork-factory.ts`, `src/lib/babylon/frame-builder.ts`, tests

**Produces:** `loadGlbRoom(scene, glbUrl, onProgress)` (append GLB via proxy URL, tag floor meshes for collision + teleport), `createArtworkMesh(scene, artwork)` branching on `artwork_type`, `createProceduralFrame(...)` + `calculateFrameDimensions(...)`.

**Prereq:** **self-host the Draco + KTX2 decoder assets** (`.wasm`/`.js`) and point Babylon at the local paths — do not let it fetch decoders from a third-party CDN (spec §5.6). Wire `AppendAsync` `onProgress` to a loading bar.

> **Why self-host decoders:** Babylon.js defaults to fetching Draco/KTX2 decoder WASM from the BabylonJS CDN. In production this creates an undeclared external dependency — a CDN hiccup silently breaks room loading. Self-hosting adds the assets to the Pages deploy bundle and eliminates that risk.
>
> **Why all three artwork types here (gap fix):** v1's `artwork-factory` only handled `IMAGE_2D`; `VIDEO` and `AUDIO` paths were unimplemented despite being in the spec. A curator who adds a YouTube video or an audio guide in the CMS would produce artworks the viewer silently could not display. All three types are built here.

1. Failing tests: `calculateFrameDimensions` outer size math; floor-mesh detection heuristic (name contains floor/ground, else largest horizontal mesh).
2. FAIL → implement:
   - **IMAGE_2D:** textured plane (`getImageUrl(id,'gallery')`) + frame + placard + spotlight; `metadata={artworkId}`.
   - **VIDEO:** screen plane + YouTube Player API binding (`youtube_video_id`).
   - **AUDIO:** marker/emitter mesh + optional Babylon spatial audio; `metadata={artworkId}`.
3. PASS.
4. Commit: `feat(3d): glb room loader and image/video/audio artwork factory`.

> Sculpture (`SCULPTURE_3D`) is deliberately out of phase 1.
>
> **Why no `SCULPTURE_3D`:** 3D sculpture artworks require a separate asset-pipeline convention (scale, origin, LODs, collision proxy), dedicated gizmo placement flows, and viewer rendering decisions distinct from 2D planes. The phase 1 scope is 2D/video/audio, which covers the launch catalogue. Sculpture can be added in phase 2 once the core platform is stable.

---

## Task 8 — Camera controller, pointer picking, Roam→Focus→Inspect

**Files:** `src/lib/babylon/camera-controller.ts`, `src/lib/babylon/interaction.ts`, tests

**Produces:** `CameraController` (drag-look default, `teleportTo(x,z)`, `focusOnArtwork(mesh)`, `calculateFocusPosition(...)`); `wireInteraction(scene, camera, scaler, handlers)` using `scene.onPointerObservable`.

> **Why this is one of the hardest tasks (two gap fixes):**
>
> v1 built the camera glide (`focusOnArtwork`) but never registered a pointer observable, so there was no click event to trigger it. The three-state model existed in the spec and DB schema but had no runtime path. This task closes the loop:
>
> - **Gap fix — pointer picking:** `scene.onPointerObservable` must resolve clicks to (a) artwork meshes via `mesh.metadata.artworkId` and (b) floor meshes for teleport. Without this, Focus and Inspect states can never be entered.
> - **Gap fix — resolution scaler wiring:** `scaler.setTier(...)` must be called at every state transition. The tiers must map exactly: Roam default + after focus close → `'WALK'`; Focus → `'FOCUS'`; Inspect → `'POPUP'`.

1. Failing test: `calculateFocusPosition` returns the point `viewDistance` in front of the artwork normal.
2. FAIL → implement. **Interaction wiring (the piece v1 missed):**
   - click floor → `teleportTo` + `scaler.setTier('WALK')`.
   - click artwork (not focused) → `focusOnArtwork` + `scaler.setTier('FOCUS')` + open info panel (callback).
   - click already-focused artwork → open Inspect lightbox + `scaler.setTier('POPUP')`.
   - close Inspect → back to FOCUS; leave Focus → WALK.
3. PASS.
4. Commit: `feat(3d): camera controller + pointer picking + roam/focus/inspect wiring`.

---

## Task 9 — Focus info panel, Inspect lightbox, hotspots

**Files:** `src/components/viewer/FocusPanel.tsx`, `src/components/viewer/InspectLightbox.tsx`, `src/components/viewer/HotspotOverlay.tsx`, test

**Produces:** slide-out `FocusPanel` (title/artist/medium/description + audio player + YouTube for video); `InspectLightbox` (`=s0` image, pan/zoom, blurred backdrop); `HotspotOverlay` (pins at `x/y_percent`, cards, audio-timestamp jump).

> **Why the Focus panel is a slide-out, not a full-screen lightbox:** the v1 plan jumped straight to a full-screen Inspect lightbox without implementing the intermediate Focus state. The three-state model requires:
>
> 1. **Roam** — no UI overlay.
> 2. **Focus** — artwork centred in-scene + a *slide-out info panel* from the screen edge (title, artist, medium, description, audio player).
> 3. **Inspect** — full-res *pop-up lightbox* with pan/zoom and hotspots.
>
> Collapsing Focus and Inspect into one jump removes the state where the majority of visitor engagement happens — reading the label and listening to the audio guide while still standing in the gallery. That intermediate state must be present at launch.

1. Failing test: Inspect requests the `=s0` original URL; hotspot with timestamp invokes the audio-seek callback.
2. FAIL → implement.
3. PASS.
4. Commit: `feat(viewer): focus panel, deep-zoom lightbox and hotspots`.

---

## Task 10 — Exhibition viewer page + WebGL fallback catalog

**Files:** `src/components/viewer/ExhibitionViewer.tsx`, `src/components/viewer/FallbackCatalog.tsx`, `src/routes/e.$slug.tsx`, test

**Produces:** `isWebGLSupported()`; viewer that fetches by slug, builds the scene (room + artworks), wires camera/interaction/scaler, renders Focus/Inspect UI; 2D catalog fallback when WebGL2 is absent.

> **Why a WebGL fallback:** not all visitors have WebGL2 (old hardware, low-end mobile, certain locked-down enterprise environments). Without a fallback the exhibition is inaccessible to those visitors. The 2D catalog — a responsive grid of images with title/artist/medium/description, audio players, and YouTube embeds — keeps the content reachable on any device and is a cheap insurance policy at this point in the build.

1. Failing test: fallback renders artworks when WebGL is unavailable (mock `isWebGLSupported → false`).
2. FAIL → implement (real behavior, not a tautology).
3. PASS.
4. Commit: `feat(viewer): exhibition page with webgl fallback catalog`.

---

## Task 11 — Curator CMS

**Files:** `src/components/studio/*` (Login, Dashboard, ExhibitionEditor, DrivePicker, ArtworkForm, GizmoPlacement), tests for pure logic

**Produces:** login (Google + password), dashboard (own exhibitions + library rooms), exhibition editor (metadata, choose/import GLB room, add artworks via Drive picker / YouTube link, place art with `GizmoManager` persisting `transform_json`, hotspot editor, draft→publish).

> **Why the CMS is almost the last task:** the viewer and the API must both be working before authoring is meaningful to test end-to-end. The CMS is the authoring surface for data the viewer consumes — it depends on Tasks 1–10 all being correct. Building it last means integration testing the full loop (create → place → publish → view) is possible in the final task.
>
> **Why GLB-only room import:** the parametric in-browser room builder was cut. Curators author rooms in Blender (guided by Appendix A of the spec) and import the resulting `.glb`. This is the simplest possible room-import path and requires no parametric geometry engine in the browser. The 25 MB / 50 MB size budget keeps Drive and the proxy comfortably within limits.

1. Failing tests: Drive-picker fileId extraction reuse; transform serialization round-trip; publish toggles `is_published`; **GLB import validation** — rejects non-`.glb` (magic-bytes check) and files over the 50 MB cap, warns under 25 MB budget (spec §5.6).
2. FAIL → implement. Gizmo placement loads the room in an authoring scene and writes back transforms via the CRUD API. On **publish**, call the media proxy's `warmCache` for the room GLB (spec §4.1 #6). On **replace room**, require a new `fileId` (or bump `?v=`) — never overwrite-in-place a cached asset (spec §4.1.1).

   > **Why cache warming at publish:** if the curator clicks "Publish" and a visitor immediately opens the exhibition, visitor #1 pays the full Drive fetch + interstitial latency as a multi-second stall. Calling `warmCache(glbFileId, env, ctx)` during the publish action pre-populates the edge cache so visitor #1 gets a cache hit.
   >
   > **Why reject overwrite-in-place (immutability contract):** the proxy caches assets with `max-age=31536000, immutable`. Google Drive keeps the same `fileId` when a file is overwritten in place — the edge cache would serve the stale room forever. Requiring a new `fileId` (or a `?v=` bump tied to `rooms.updated_at`) is the only way to guarantee visitors see the curator's latest work.

3. PASS.
4. Commit: `feat(studio): curator cms — auth, editor, drive picker, gizmo placement, publish`.

**Deliverable:** ship the **Blender room-authoring checklist** (spec Appendix A) as an in-app help doc / downloadable, and a reference `.blend` template, alongside at least one platform library room that passes it.

---

## Task 12 — Analytics (Workers Analytics Engine)

**Files:** `worker/routes/events.ts`, `src/lib/analytics.ts`, `src/components/studio/AnalyticsPanel.tsx`, test

**Produces:** `POST /api/events` → `env.AE.writeDataPoint`; client batches `exhibition_view`/`artwork_focus`/`artwork_inspect`/`artwork_dwell`; dashboard reads AE aggregates (views/exhibition, focus+inspect counts, mean dwell/artwork).

> **Why Analytics Engine, not D1:** D1 is SQLite. Per-visitor engagement events arrive at a rate that SQLite write throughput cannot absorb without contending with the app's own CRUD writes. At 100 concurrent visitors engaging with 10–20 artworks each, the event volume would lock the D1 database and make curator saves unreliable. Workers Analytics Engine is designed for exactly this pattern — high-volume time-series event ingestion — and its aggregation queries are the right tool for the curator dashboard.

1. Failing test: event batching flushes shape correctly; ingest maps to AE blobs/doubles.
2. FAIL → implement. **Events go to AE, never D1.**
3. PASS.
4. Commit: `feat(analytics): engagement events via analytics engine + curator panel`.

---

## Task 13 — Deploy

**Files:** `wrangler.toml` (final), Pages build config, `README` deploy notes

**Produces:** Pages serves the built SPA; Worker serves `/api/*` with D1 + AE bindings; secrets (Google OAuth client id/secret, JWT signing key) via `wrangler secret`.

1. `wrangler d1 migrations apply`; deploy Worker; deploy Pages; smoke-test: publish an exhibition, load it as a visitor, confirm media proxy cache hits (second load), confirm an event lands in AE.
2. Commit: `chore: cloudflare pages + worker deploy config`.

---

## Deferred to phase 2 (explicitly not built now)

Parametric in-browser room builder (floor-plan editor, walls, CSG doorways, material/lighting inspectors) · room template authoring UI · mini-map · 3D sculpture artworks · automated guided tour · password-gated exhibitions · deep analytics dashboards · optional FPS camera mode · surface-snapping during placement.

> See the **Cut scope** table at the top of this document for the rationale behind each deferral.
