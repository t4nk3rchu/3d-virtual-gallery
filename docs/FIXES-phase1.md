# Phase-1 Fix List

Hand-off to the implementing model. Context: a review of the phase-1 implementation (full report in `docs/REVIEW-phase1-implementation.md`; spec in `docs/spec/3D Virtual Gallery — Design Specification v2.md`; plan in `docs/plan/3D Virtual Gallery — Phase 1 Implementation Plan.md`).

**Read first:** the test suite passes (68 green) but the app **does not compile** — vitest strips types without checking them, so green tests hid a broken build. Run `npm run build` (`tsc -b && vite build`), not just `npm test`, as your definition of done. A recurring defect below is **code that is defined but never wired** (`warmCache`, engagement events) — for each fix, verify the call site actually runs, don't just add the function.

Fix in this order. Each item: what's wrong → what to do → how to verify.

---

## 1. BLOCKER — make it compile (`npm run build`)

`tsc -b` currently errors. Fix all of:

- **`Response.json<T>()` misuse** in `src/components/viewer/ExhibitionViewer.tsx`, `src/components/studio/StudioApp.tsx` (6 sites). The generic is a Cloudflare Workers extension; browser DOM `Response.json()` takes no type argument. Change to `await res.json() as T` (or a typed helper).
- **`src/lib/babylon/resolution-scaler.ts:28`** — `constructor(private readonly engine: ...)` parameter-property is disallowed under this tsconfig (`erasableSyntaxOnly`). Declare the field explicitly and assign in the body.
- **`src/lib/babylon/engine.ts:38`** — `KhronosTextureContainer2.URLConfig` is missing required fields (`wasmUASTCToR8_UNORM`, `wasmUASTCToRG8_UNORM`, `wasmZSTDDecoder`). Provide all fields (point them at the self-hosted paths from fix #2).
- **`src/components/viewer/ExhibitionViewer.tsx:183`** — `artwork.hotspots` doesn't exist on `Artwork`. Hotspots must come from the exhibition detail payload; thread them correctly (add to the `Artwork`/`ExhibitionDetail` type and the `by-slug` query, or pass a separate `hotspotsByArtwork` map). Fix type + runtime together.
- **`noUnusedLocals`** failures — remove unused `import React` (React 19 JSX transform), unused `Vector3`, `useCallback`, and unused test imports.

**Verify:** `npm run build` exits 0.

---

## 2. BLOCKER — self-hosted decoders exist and load

`src/lib/babylon/engine.ts` points Babylon at `/decoders/*.wasm|*.js`, but `public/decoders/` does not exist and no build step copies them. Draco/KTX rooms (required by the spec's size budget) will 404 and fail to load.

- Copy the Babylon Draco + KTX2 decoder assets into `public/decoders/` (from `@babylonjs/core` distribution) so Vite serves them, matching the exact filenames referenced in `engine.ts`.
- **Verify:** load a Draco-compressed GLB in the viewer; confirm no 404 for `/decoders/...` in the network tab and the mesh renders.

---

## 3. CRITICAL — procedural frames render at world origin

`src/lib/babylon/frame-builder.ts::createProceduralFrame` builds its 4 strips at positions relative to (0,0,0) and never parents them to the artwork. `createImage2DArtwork` ignores the return and does no parenting → every frame detaches and stacks at the origin.

- Parent the frame strips to the artwork plane (or a shared root) so they inherit the artwork's position/rotation/scale. Return the frame root and parent it in `artwork-factory.ts`.
- **Verify:** place two artworks at different positions; each frame surrounds its own artwork.

---

## 4. CRITICAL — make the interaction state machine authoritative (scaler stuck)

`src/lib/babylon/interaction.ts` holds its own `state`; the React components (`ExhibitionViewer` + `FocusPanel`/`InspectLightbox`) hold theirs, unsynced. Closing the lightbox never resets `interaction` state or the scaler → engine stays locked at POPUP (100%) after the first inspect; closing FocusPanel leaves state at FOCUS so a different artwork can't be focused.

- Expose imperative transitions from `interaction.ts` (e.g. `leaveInspect()`, `leaveFocus()`/`reset()`), and have the React `onClose` handlers call them so the scaler tier resets (POPUP→FOCUS on lightbox close, FOCUS→WALK on panel close). Single source of truth: the interaction machine drives React via `onStateChange`, and React close buttons call back into it — no independent state.
- **Verify:** open→inspect→close an artwork, then roam; confirm `engine.getHardwareScalingLevel()` is back to the WALK value (`1/0.75`). Close the focus panel, click a different artwork; confirm it focuses.

---

## 5. CRITICAL — build the curator authoring UI

`src/components/studio/StudioApp.tsx::ArtworkManager` is a placeholder (`setArtworks([])`, "scaffold shows the shell"). The entire authoring flow is missing. Build:

- **Artwork list + form** — fetch existing artworks for the exhibition; add/edit/delete via the CRUD API (`/api/artworks`, `/api/artworks/:id`). Fields per `Artwork` (type, metadata, media).
- **Google Drive picker** — OAuth-backed picker to select image/audio files; extract fileId via `extractGoogleDriveFileId`; warn if the file isn't public-link shared.
- **YouTube link input** for VIDEO (parse via `parseYouTubeVideoId`).
- **GLB room import** — a real import path that runs `validateGlbFile` (currently dead code) before creating the room; enforce the <50 MB cap / <25 MB warning.
- **3D gizmo placement** — load the room in an authoring Babylon scene, select an artwork, use `GizmoManager` for position/rotation/scale, persist `transform_json` via `PUT /api/artworks/:id`.
- **Hotspot editor** — click on an artwork image to drop pins; CRUD via `/api/hotspots`.

**Verify:** as a curator, create an exhibition, import a GLB room, add an image + a video + an audio artwork, position one with the gizmo, add a hotspot, publish — all through the UI.

---

## 6. HIGH — feature wiring dead-ends

- **Audio artworks silent** — `src/components/viewer/FocusPanel.tsx` reads `artwork.audio_guide_file_id`; AUDIO-type artworks store the file in `media_file_id`. Play `media_file_id` for AUDIO type (keep `audio_guide_file_id` as the optional narration for any type). Verify: focusing an audio artwork shows a working `<audio src="/api/media/...">`.
- **Hotspot audio-seek dead** — `InspectLightbox.onAudioSeek` targets the viewer's hidden `<audio>` which has no `src`. Give that element the artwork's audio source (or move the audio element into the lightbox). Verify: clicking a hotspot with a timestamp seeks a playing track.
- **`warmCache` never called** — `worker/media-proxy.ts::warmCache` exists but the publish path (`worker/routes/crud.ts`, PUT `is_published=1`) never calls it. On publish, call `warmCache` for the room GLB (and audio file ids) via `ctx.waitUntil`. Verify: publish, then confirm the first viewer request is a cache hit.
- **Analytics only emits `exhibition_view`** — spec §8 requires medium depth. Emit `artwork_focus`, `artwork_inspect`, and `artwork_dwell` (with seconds) from the interaction handlers in `ExhibitionViewer`, batched to `POST /api/events`. Verify: focusing/inspecting artworks produces events with the artwork_id.

---

## 7. HIGH — verify the Drive interstitial against a real large file

`worker/media-proxy.ts::fetchDriveFollowingInterstitial` uses the legacy `uc?export=download&confirm=<token>` query flow and carries no cookies between the two requests. Modern Drive serves large downloads from `drive.usercontent.google.com` with a cookie-paired token, so this may fail for GLBs over ~100 MB.

- Test against a real public Drive file >100 MB. If it fails, update to the `drive.usercontent.google.com/download` flow, carrying the confirm token + cookie from the first response.
- **Verify:** a >100 MB public GLB streams through `/api/media/:fileId` and caches (second request = hit, correct bytes, not HTML).

---

## 8. MEDIUM — hardening

- **`worker/routes/events.ts`** — endpoint is unauthenticated and loops `writeDataPoint` over an unbounded array. Cap batch length (e.g. ≤50) and add a basic origin/rate guard.
- **`src/lib/babylon/room-loader.ts`** — sets `checkCollisions=true` on every mesh; spec §5.6 wants floor + walls only. Restrict collision to floor + wall meshes.
- **Replace-room versioning** (spec §4.1.1) — overwriting a GLB in place on Drive serves the stale cached copy for a year. On room GLB change, require a new fileId or append a `?v=<updated_at>` cache-buster to the proxy URL.

---

## Definition of done

- `npm run build` exits 0 (not just `npm test`).
- A curator can author + publish a complete exhibition (image/video/audio + gizmo placement + hotspot) entirely through the UI.
- A visitor can roam → focus → inspect, audio plays, hotspots seek, and the resolution scaler returns to WALK after inspecting.
- Publish warms the cache; engagement events land in Analytics Engine.
- Every previously-dead helper (`warmCache`, `validateGlbFile`, engagement events) has a live call site.
