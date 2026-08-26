# 3D Virtual Gallery & Exhibition Platform — Design Specification (v2)

**Supersedes:** `3D Virtual Gallery & Exhibition Platform — Complete Design Specification.md`
**Status:** re-scoped after requirements review (see `docs/REVIEW.md`)
**Date:** 2026-08-25

**Target Stack:** Vite + React (SPA, TypeScript), Babylon.js 7+, Cloudflare Pages (static client) + Cloudflare Workers (API), Cloudflare D1 (app data), Cloudflare Workers Analytics Engine (engagement events), Google Drive (asset source, public-link), Google image CDN (2D images), YouTube Player API (video).

**Reference model:** [Kunstmatrix](https://artspaces.kunstmatrix.com) — as inspiration only; this spec is deliberately narrower.

---

## 1. Scope

Multi-tenant platform where curators sign in, import a 3D room (GLB), place their artworks into it, and publish an interactive exhibition that visitors walk through in the browser.

**Launch (phase 1) targets:** ~5 curators, ~100 concurrent visitors. Architected so scale is not *blocked*, but **not** pre-built for scale that doesn't exist yet.

### 1.1 In scope (phase 1)

- Curator auth: Google OAuth (primary) + email/password fallback.
- Exhibition CMS: create/edit exhibitions, GLB room import, Google Drive asset picker, artwork placement via 3D gizmo, draft/publish.
- Artwork types: **2D image**, **video (YouTube)**, **audio**.
- Public viewer: Roam → Focus → Inspect interaction, hotspots, deep-zoom lightbox, dynamic resolution scaling, WebGL fallback catalog.
- Media pipeline: Google image CDN (images), YouTube (video), edge-cached Worker proxy (audio + room GLB).
- Analytics: per-artwork engagement events via Analytics Engine.

### 1.2 Out of scope (phase 2+)

Parametric in-browser room builder (2D floor-plan editor, wall drawing, CSG doorways, material/lighting inspectors) · room template authoring UI · mini-map · 3D sculpture artworks · automated guided tour · password-gated public exhibitions · deep analytics dashboards · multi-account "our Drive" sharding.

---

## 2. Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │            Cloudflare Global Edge               │
                    │                                                 │
                    │   ┌─────────────────────────────────────────┐  │
                    │   │  Cloudflare Pages (static)               │  │
                    │   │  Vite + React SPA + Babylon.js client    │  │
                    │   └────────────────────┬────────────────────┘  │
                    │                        │ fetch /api/*           │
                    │   ┌────────────────────▼────────────────────┐  │
                    │   │  Cloudflare Worker (API)                 │  │
                    │   │  • /api/auth/*      (OAuth + JWT cookie) │  │
                    │   │  • /api/exhibitions (D1 CRUD)            │  │
                    │   │  • /api/media/[fileId] (Cache API+Range) │  │
                    │   │  • /api/events      (Analytics Engine)   │  │
                    │   └───┬───────────────┬──────────────┬──────┘  │
                    │       │ D1            │ Cache API    │ AE       │
                    └───────┼───────────────┼──────────────┼─────────┘
                            ▼               ▼              ▼
                    ┌────────────┐   ┌────────────┐  ┌──────────────┐
                    │ D1 (app    │   │ Google      │  │ Analytics    │
                    │ data)      │   │ Drive       │  │ Engine       │
                    └────────────┘   └────────────┘  └──────────────┘

    Direct-from-client (no proxy):
      2D images → https://lh3.googleusercontent.com/d/{fileId}=w1600 | =s0
      video     → YouTube Player API iframe
```

Three subsystems:

1. **Viewer** — Babylon.js SPA that loads a GLB room, mounts artworks, and drives the Roam/Focus/Inspect interaction.
2. **Curator CMS** — React authoring UI: import room, pick Drive assets, place art with a gizmo, edit metadata, publish.
3. **Edge API** — a single Worker exposing auth, CRUD, the media proxy, and event ingestion.

### 2.1 Why this stack

- **Vite SPA, not Next.js:** the app is a client-side WebGL SPA with a few JSON endpoints; no SSR/SEO need (§10). Avoids the edge-runtime/RSC friction of `next-on-pages`.
- **Single Worker for the API:** plain runtime, no framework impedance, direct D1 / Cache API / Analytics Engine bindings.
- **Babylon.js:** locked in; correct engine for the job.

---

## 3. Data model (Cloudflare D1 / SQLite)

App data only. Engagement events go to Analytics Engine (§8), **not** D1.

### 3.1 `users`

Curator accounts. Supports both Google-identity and password-fallback logins.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `crypto.randomUUID()` |
| `email` | TEXT UNIQUE NOT NULL | |
| `full_name` | TEXT NOT NULL | |
| `auth_provider` | TEXT NOT NULL | `'google'` or `'password'` |
| `google_sub` | TEXT UNIQUE | Google subject id; null for password accounts |
| `password_hash` | TEXT | **PBKDF2 (WebCrypto)**, null for google accounts. Never bcrypt/Argon2 (no native addons on Workers). |
| `role` | TEXT DEFAULT 'curator' | `'admin'` or `'curator'` |
| `created_at` | INTEGER NOT NULL | unix epoch |

### 3.2 `rooms`

An importable GLB room. Owned by a curator or provided by the platform.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `owner_user_id` | TEXT | null = platform-provided library room |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `thumbnail_url` | TEXT | |
| `glb_file_id` | TEXT NOT NULL | Google Drive file id of the GLB |
| `glb_source` | TEXT NOT NULL | `'curator_drive'` or `'platform_drive'` |
| `spawn_json` | TEXT | JSON: initial camera `{position:[x,y,z], target:[x,y,z]}` |
| `is_public` | INTEGER DEFAULT 0 | 1 = shared to the library for reuse |
| `created_at` | INTEGER NOT NULL | |

> Phase 2 will add parametric room fields; phase 1 rooms are GLB-only.

### 3.3 `exhibitions`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `user_id` | TEXT NOT NULL | owner → `users.id`, ON DELETE CASCADE |
| `room_id` | TEXT NOT NULL | → `rooms.id` |
| `title` | TEXT NOT NULL | |
| `slug` | TEXT UNIQUE NOT NULL | public URL `/e/{slug}` |
| `description` | TEXT | curatorial statement |
| `curator_name` | TEXT | display text |
| `start_date` / `end_date` | TEXT | ISO strings |
| `is_published` | INTEGER DEFAULT 0 | 1 = public, 0 = draft (owner-only) |
| `cover_image_url` | TEXT | |
| `settings_json` | TEXT | JSON: background audio file id, ambient light intensity, default eye height |
| `created_at` | INTEGER NOT NULL | |

> No `password_hash` on exhibitions in phase 1 — access is draft vs published only.

### 3.4 `artworks`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `exhibition_id` | TEXT NOT NULL | → `exhibitions.id`, CASCADE |
| `title` | TEXT NOT NULL | |
| `artist` | TEXT NOT NULL | |
| `year` / `medium` / `dimensions` | TEXT | |
| `description` | TEXT | interpretive text |
| `artwork_type` | TEXT NOT NULL | `'IMAGE_2D'` \| `'VIDEO'` \| `'AUDIO'` |
| `media_file_id` | TEXT | Drive file id (image / audio) |
| `youtube_video_id` | TEXT | for `VIDEO` |
| `audio_guide_file_id` | TEXT | optional narration (any type) |
| `transform_json` | TEXT NOT NULL | `{position:[x,y,z], rotation:[x,y,z], scale:[x,y,z]}` |
| `frame_config_json` | TEXT NOT NULL | see §6.3 |
| `order_index` | INTEGER NOT NULL | catalog/fallback ordering |

### 3.5 `artwork_hotspots`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `artwork_id` | TEXT NOT NULL | → `artworks.id`, CASCADE |
| `x_percent` / `y_percent` | REAL NOT NULL | 0–100, position over the image |
| `title` | TEXT NOT NULL | |
| `description` | TEXT NOT NULL | |
| `audio_timestamp_seconds` | REAL | optional jump point in the artwork's audio guide |

Indexes: `exhibitions(slug)`, `exhibitions(user_id)`, `artworks(exhibition_id)`, `artwork_hotspots(artwork_id)`, `rooms(owner_user_id)`.

All D1 access uses **parameterized prepared statements**.

---

## 4. Media pipeline & edge caching

Assets live on Google Drive (curator's or platform's) and are **shared public-link**. OAuth is used only for the authoring picker, never at serve time.

| Asset | Path | Caching |
|---|---|---|
| 2D image | `lh3.googleusercontent.com/d/{fileId}=w1600` (gallery), `=s0` (deep-zoom), `=w400` (thumb) | Google CDN; client loads directly |
| Video | YouTube Player API iframe (`youtube_video_id`) | YouTube |
| Audio | `/api/media/{fileId}` → Worker proxy | Cloudflare Cache API |
| Room GLB | `/api/media/{fileId}` → Worker proxy | Cloudflare Cache API |

### 4.1 Worker media proxy — required behavior

The proxy is the load-bearing component for scale. It **must**:

1. **Use the Cloudflare Cache API explicitly** — `caches.default.match(request)` first; on miss, fetch upstream, then `cache.put(request, response.clone())` (via `ctx.waitUntil`). Setting `Cache-Control` alone does **not** cache a Worker subrequest. *(This is the #1 bug in v1 — it was never implemented.)*
2. **Handle the Google Drive interstitial** — `drive.google.com/uc?export=download` returns an HTML virus-scan page for large files (room GLBs). Detect the interstitial (HTML content-type / confirm token) and follow through with the `confirm=` token, or use an endpoint that streams bytes directly. Never cache HTML as a model.
3. **Support HTTP Range correctly** — forward `Range`; only cache **full (200)** responses, never a `206` partial as if whole. Serve range slices from the cached full asset. This makes audio seeking work.
4. Set `Cache-Control: public, max-age=31536000, immutable` and permissive CORS on served responses.
5. Validate `fileId` against `^[a-zA-Z0-9_-]+$` before use.
6. **Cache warming:** on publish (and on curator preview), fire one `ctx.waitUntil` fetch of the room GLB through the proxy so the edge cache is warm before the first real visitor — otherwise visitor #1 pays the full Drive fetch (+ interstitial) as a multi-second stall.

### 4.1.1 Immutability & versioning

The `immutable, max-age=1yr` policy is correct **only if the URL changes when the asset changes.** Google Drive keeps the same `fileId` when a file is *overwritten in place* — so an edge-cached room would serve the stale version forever. Therefore: replacing a room requires a **re-import (new `fileId`)**, or the proxy URL must carry a `?v=` cache-buster tied to the room's updated timestamp. Never allow silent overwrite-in-place of a cached asset.

### 4.2 Image CDN caveat

`lh3.googleusercontent.com/d/{id}` is **undocumented** and has broken before. Wrap image URL generation in a single helper so a fallback (e.g. proxying images too) is a one-file change if Google breaks it.

---

## 5. Viewer engine (Babylon.js)

### 5.1 Interaction model — Roam / Focus / Inspect

| State | Trigger | Behavior | Resolution tier |
|---|---|---|---|
| **Roam** | default | Drag/pan to look; WASD/arrows to walk; click floor → smooth move to point. | **WALK — 75%** (`setHardwareScalingLevel(1/0.75)`) |
| **Focus** | click an artwork | Camera glides perpendicular to the piece; artwork centered; **info panel slides out from screen edge**. | **FOCUS — 90%** (`1/0.9`) |
| **Inspect** | click the focused artwork again | Full-res (`=s0`) **pop-up lightbox** over a blurred scene; pan/zoom; **hotspots** overlaid. | **POPUP — 100%** (`1.0`) |

- Camera: `UniversalCamera` at eye height `y = 1.7 m`, ellipsoid collision `(0.5, 0.9, 0.5)`, `checkCollisions = true`.
- Default control is **drag-to-look**, not FPS pointer-lock. (Optional FPS toggle is phase 2.)
- **The resolution scaler must be wired to these state transitions** — in v1 it existed but was never called.
- **Pointer picking is required** — `scene.onPointerObservable` resolves clicks to artwork meshes (via `mesh.metadata.artworkId`) and to the floor for teleport. In v1 this was entirely missing, so nothing could trigger Focus/Inspect.

### 5.2 Room loading

- GLB loaded via `SceneLoader.AppendAsync` through the media proxy URL.
- Floor/ground meshes tagged `checkCollisions = true` and registered as teleport raycast targets (name heuristic: contains `floor`/`ground`, with a fallback to the largest horizontal mesh).
- Ambient `HemisphericLight` for base illumination; per-artwork `SpotLight` (35° down) for gallery lighting.
- `DefaultRenderingPipeline` with FXAA on.

### 5.3 Artwork presentation

- **2D image:** textured plane from the image CDN (`=w1600`), procedural frame (§6.3), optional wall placard (title/artist/medium via `DynamicTexture`), dedicated spotlight.
- **Video:** a screen plane bound to the **YouTube Player API** (HTML overlay synced to the mesh position, or `VideoTexture` from the YT stream). No Drive video.
- **Audio:** a visible marker/emitter mesh at its transform; click → Focus shows the info panel with an `<audio>` player; optional Babylon spatial audio pinned to the location.
- Every artwork mesh carries `metadata = { artworkId }` for picking.

### 5.4 Deep-zoom + hotspots (Inspect)

- Lightbox loads `=s0` full-res image, pan/zoom, scene blurred behind.
- Hotspot pins (`artwork_hotspots`) render at `x_percent/y_percent`; click → interpretive card; if `audio_timestamp_seconds` set, jump the audio guide.

### 5.5 WebGL fallback

If WebGL2 is unavailable, render a responsive **2D catalog** (cover, grid of images with title/artist/medium/description, audio players, YouTube embeds). Keeps the exhibition usable on old devices and low-end mobile.

### 5.6 Room GLB authoring & serving

Room GLB files live on Google Drive and are served through the edge-cached proxy (§4). Most GLB risk (interstitial, slow first load, broken navigation) is eliminated *at authoring time* by keeping files small and following a convention — not by proxy code. Rules:

- **Size budget:** target **< 25 MB**, hard cap ~50 MB. A file this small stays under Drive's ~100 MB virus-scan interstitial threshold entirely, caches in one shot, and loads fast. Reject oversized uploads at import with a clear message.
- **Compression:** **Draco** (geometry) + **KTX2/Basis** (textures). Babylon loads both natively — but **self-host the Draco/KTX decoder `.wasm`/`.js`** rather than pulling them from a third-party CDN.
- **Bake lighting into textures.** Rooms are static; bake AO/shadows so the viewer pays no realtime-GI cost. Helps the 75% WALK tier hold 60 fps.
- **Single-file `.glb` only** — reject `.gltf`. A split `.gltf` references `.bin` + loose textures by relative URL, which will not resolve through the Drive proxy. Validate the GLB magic bytes (`glTF`) on import.
- **Scale = 1 unit : 1 metre**, floor at `y = 0`, origin at the intended spawn point, model facing the entry direction. Store the spawn camera in `rooms.spawn_json`. Wrong scale/origin is the #1 cause of a room that "feels broken" (camera clipping, teleport off, wrong eye height).
- **Collision convention:** only the floor (`floor`/`ground`) and walls get `checkCollisions`; decorative props do not (per-mesh collision is expensive). Optionally ship a hidden low-poly `collider_*` proxy.
- **Whole-file load:** GLB is not progressively streamable — Babylon loads it fully before render. Wire `AppendAsync` `onProgress` to a loading bar so a big room never looks frozen. (Range matters for audio, not GLB.)

Platform-provided library rooms must themselves pass this checklist; they are the reference examples curators copy.

---

## 6. Curator CMS

### 6.1 Auth & onboarding

- **Sign in with Google** (primary): OAuth → store `google_sub`, email, name. Same OAuth grant powers the Drive picker.
- **Email/password** (fallback, for curators without Google, using platform-provided rooms/assets): PBKDF2 via WebCrypto.
- Session: signed **HTTP-only JWT cookie** issued by the Worker.

### 6.2 Exhibition authoring flow

1. Create exhibition (title, slug, curatorial text, dates).
2. **Choose a room:** import a GLB (Drive picker → store `glb_file_id`) or pick a platform library room.
3. **Add artworks:** Google Drive picker for image/audio; paste YouTube URL for video; enter metadata.
4. **Place artworks:** load the room in a Babylon authoring scene; drag/select a piece; **`GizmoManager`** for position/rotation/scale fine-tuning; persist `transform_json`. Surface-snapping to walls is a nice-to-have, not required for launch.
5. **Hotspots:** click on an artwork image to drop pins, edit text, optionally bind an audio timestamp.
6. **Preview** (draft) → **Publish** (`is_published = 1`).

### 6.3 Frame config

`frame_config_json`: `{ frameType: 'wood'|'metal_black'|'float_white'|'canvas_wrap'|'none', frameWidth, matWidth, matColor, showPlacard }`. Procedural molding materials; beveled matting; wall placard toggle.

### 6.4 Asset importer

- **Google Drive picker** (OAuth): select file(s), extract `fileId`, verify the file is public-link shared (warn the curator if not — the most common support issue).
- **YouTube linker:** validate URL, extract `youtube_video_id`.

---

## 7. API surface (Worker)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/google` / `/api/auth/google/callback` | GET | OAuth start / callback → set JWT cookie |
| `/api/auth/login` / `/api/auth/register` | POST | password fallback |
| `/api/auth/logout` | POST | clear cookie |
| `/api/exhibitions` | GET/POST | list own / create |
| `/api/exhibitions/{id}` | GET/PUT/DELETE | read / update / delete (owner only) |
| `/api/exhibitions/by-slug/{slug}` | GET | public read (published only, unless owner) |
| `/api/rooms` | GET/POST | list (own + public library) / create from GLB |
| `/api/artworks` (+ `/{id}`) | CRUD | scoped to an exhibition the caller owns |
| `/api/hotspots` (+ `/{id}`) | CRUD | scoped to an artwork the caller owns |
| `/api/media/{fileId}` | GET | edge-cached proxy (audio + GLB), Range support |
| `/api/events` | POST | ingest engagement events → Analytics Engine |

Auth-required routes verify the JWT cookie; public routes expose only published data.

---

## 8. Analytics (medium depth)

Per-artwork engagement, written to **Workers Analytics Engine** (not D1 — SQLite write throughput can't take per-visitor event volume and would contend with app writes).

- **Events:** `exhibition_view`, `artwork_focus`, `artwork_inspect`, `artwork_dwell` (with seconds). Blobs: `exhibition_id`, `room_id`, `artwork_id`, `artwork_type`. Doubles: dwell seconds.
- **Ingest:** viewer batches events → `POST /api/events` → `env.AE.writeDataPoint(...)`.
- **Read:** curator dashboard queries AE aggregates: views per exhibition, focus/inspect counts and mean dwell per artwork ("most-attended pieces").
- Deep analytics (time series, unique-visitor dedup, funnels, export) → phase 2.
- Privacy: no PII in events; anonymous visitor id at most; decline non-essential cookies by default.

---

## 9. Performance, security, errors

- **Perf:** frustum culling on; dispose textures/meshes of unloaded rooms; the 3-tier scaler as the primary FPS lever.
- **Security:** parameterized D1 statements; JWT HTTP-only cookies; ownership checks on every mutating route; `fileId` validation on the proxy; public-link assets carry no secrets.
- **Errors:** GLB load failure → friendly message + retry; broken image → placeholder; WebGL absent → 2D catalog (§5.5); proxy upstream failure → surfaced status, never a cached error body.

---

## 10. No SEO requirement

Public exhibitions are shared by direct link, not discovered via search — so no SSR/SEO work in phase 1. A future marketing homepage, if built, can be a separate statically-generated page.

---

## 11. Testing strategy

- **Unit (Vitest):** Drive fileId extraction, image-URL tiers, YouTube id parse, resolution-scaler tier mapping, frame-dimension math, camera focus-vector math, PBKDF2 hash/verify, JWT sign/verify. **Plus the parts v1 skipped:** proxy interstitial detection and Range slicing (against mocked upstreams).
- **Integration (Miniflare/workerd):** D1 CRUD + ownership enforcement; media proxy cache hit/miss + Range; `/api/events` write path.
- **E2E (Playwright):** WebGL context init; Roam→Focus→Inspect transitions and matching resolution tiers; camera collision (no walking through walls); click-to-focus and hotspot cards; CMS import-room → place-art (gizmo) → publish → view.
- **No test theater:** every test must be able to fail for a real reason. Drop v1's tautological tests (asserting a function merely exists, or re-testing an already-covered helper).

---

## Appendix A — Blender room-authoring checklist

Hand this to anyone authoring a room GLB (platform staff, curators, third parties). A room that passes this imports and navigates correctly with no per-room fixes.

**Scale & orientation**
- [ ] Units set to **metric, 1.0 scale** (Scene Properties → Units). 1 Blender unit = 1 metre.
- [ ] Floor sits at **Z = 0** in Blender (exports to Y = 0 in glTF — the exporter handles the up-axis swap).
- [ ] Model **origin at the visitor spawn point** (where the camera should start), not the mesh's arbitrary center.
- [ ] Room faces the intended **entry direction** at spawn.
- [ ] Doorways/ceilings tall enough for a 1.7 m eye height with headroom (≥ 2.2 m clearance).

**Geometry & naming**
- [ ] Floor mesh named `floor` or `ground`.
- [ ] Walls are separate, closed geometry (no gaps a visitor can walk through).
- [ ] Decorative props kept as separate meshes so they can skip collision.
- [ ] (Optional) hidden low-poly collision proxy named `collider_*`.
- [ ] Apply all transforms before export (Object → Apply → All Transforms) so scale/rotation bake in.

**Materials & lighting**
- [ ] Lighting **baked into textures** (AO/shadows); no reliance on realtime scene lights.
- [ ] Textures reasonably sized (≤ 2K per map; 1K where it reads fine).
- [ ] Textures compressed to **KTX2/Basis** where possible.

**Export settings (glTF 2.0)**
- [ ] Format: **glTF Binary (.glb)** — single file.
- [ ] **Draco mesh compression** enabled.
- [ ] Include: Selected Objects (or the whole room collection), Materials, Textures.
- [ ] +Y up (default).
- [ ] Apply modifiers.

**Before upload**
- [ ] File is **< 25 MB** (hard cap 50 MB). If larger: decimate geometry, shrink textures, ensure Draco is on.
- [ ] Opens correctly in a glTF viewer (e.g. Babylon Sandbox) — floor at ground level, correct scale, no missing textures.
- [ ] Uploaded to Google Drive and set to **"Anyone with the link — Viewer."**
```
