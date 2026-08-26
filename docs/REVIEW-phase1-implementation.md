# Phase-1 Implementation Review

**Reviewed against:** `docs/plan/3D Virtual Gallery — Phase 1 Implementation Plan.md` + `docs/spec/...v2.md`
**Date:** 2026-08-25
**Method:** full read of worker + src, ran `vitest` (68 pass) and `tsc -b` (fails).

## Verdict

The high-risk architecture I flagged in the v1 review was handled well — the media proxy, the wired resolution scaler + pointer picking, PBKDF2 auth, and Analytics-Engine ingestion are all genuinely there. **But the build does not compile, the entire curator authoring half is a stub, and several features are wired to dead ends.** Green tests are misleading: vitest doesn't type-check, so a non-building app shows 68 passing tests.

Not shippable yet. Blockers below.

---

## BLOCKER

### B1 — `npm run build` fails (does not compile)
`tsc -b` errors (tests miss these because vitest skips type-checking):
- `Response.json<T>()` used in browser components (`ExhibitionViewer.tsx`, `StudioApp.tsx`, 6×) — the generic is a Workers extension; DOM `Response.json()` takes no type arg. `error TS2558`.
- `resolution-scaler.ts:28` — `constructor(private readonly engine)` parameter-property is disallowed under this tsconfig (`erasableSyntaxOnly`). `error TS1294`.
- `engine.ts:38` — `KhronosTextureContainer2.URLConfig` object is missing required fields (`wasmUASTCToR8_UNORM`, `wasmUASTCToRG8_UNORM`, `wasmZSTDDecoder`). `error TS2739`.
- `ExhibitionViewer.tsx:183` — `artwork.hotspots` doesn't exist on `Artwork` (type + runtime bug; hotspots are read off the wrong shape).
- Multiple `noUnusedLocals` failures (`import React` unused under the React 19 JSX transform; unused `Vector3`, `useCallback`, test imports).

**Until this compiles, nothing else can be trusted at runtime.**

---

## CRITICAL

### C1 — Curator CMS authoring is a stub (Task 11 largely unbuilt)
`StudioApp.tsx` has login / dashboard / create-exhibition, but `ArtworkManager` is a placeholder that hard-codes `setArtworks([])` with comments "would render here / for brevity, this scaffold shows the shell." Missing entirely:
- Drive picker, ArtworkForm (no way to add an artwork through the UI at all)
- **3D gizmo placement** — the one authoring tool we explicitly kept for phase 1
- hotspot editor
- GLB import UI — so `validateGlbFile` (which is correct) is **dead code**, never called; `NewExhibitionForm` only picks a pre-existing room from a dropdown.

Curators literally cannot populate or arrange an exhibition. This is ~half the product.

### C2 — Self-hosted decoders 404 at runtime
`engine.ts` points Babylon at `/decoders/*.wasm|*.js`, but `public/decoders/` does not exist and nothing copies decoder assets in the build. Any room using **Draco or KTX2 fails to load** — and the spec's entire size-budget strategy *requires* Draco. Compounds with C3's floor logic to make real rooms non-functional.

### C3 — Procedural frames render at world origin
`createProceduralFrame` builds its 4 strips at positions relative to **(0,0,0)** and never parents them to the artwork plane or offsets them by the artwork transform. Every frame detaches from its artwork and piles up at the world origin. (`createImage2DArtwork` ignores the return and does no parenting.)

### C4 — Viewer state desync → resolution scaler gets stuck
`interaction.ts` holds its own `state`, and the React components hold theirs, with no sync back:
- Closing `InspectLightbox` (React `onClose`) sets `inspectedArtwork=null` but never resets `interaction` state or the scaler → **engine stays locked at POPUP (100%) forever after the first inspect**, defeating the 3-tier performance feature that was the whole point of Task 6/8.
- Closing `FocusPanel` leaves `interaction.state === 'FOCUS'`, so clicking a *different* artwork afterward does nothing (only the still-focused mesh responds).

The interaction state machine needs to be the single source of truth, or the React close handlers must call back into it.

---

## HIGH

### H1 — AUDIO artworks are silent
`FocusPanel` renders the `<audio>` from `artwork.audio_guide_file_id`, but an AUDIO-type artwork stores its file in `media_file_id`. So focusing an audio artwork shows metadata and no player.

### H2 — Hotspot audio-seek is a dead end
`InspectLightbox.onAudioSeek` sets `audioRef.current.currentTime`, but the viewer's `<audio ref>` never gets a `src`. Jumping to a hotspot timestamp does nothing.

### H3 — `warmCache` never called on publish
The proxy exposes `warmCache` (spec §4.1 #6) but the publish path (`crud.ts` PUT `is_published=1`) never invokes it. Dead code — the same "built but never wired" class of bug this review was meant to prevent. First visitor still eats the cold-cache stall.

### H4 — Analytics under-delivers "medium"
Only `exhibition_view` is emitted (from the viewer mount). No `artwork_focus` / `artwork_inspect` / `artwork_dwell` — which was the entire point of medium-depth analytics (spec §8). The interaction handlers are the natural emit points and don't.

### H5 — Drive interstitial method is likely outdated (verify with a real large file)
`fetchDriveFollowingInterstitial` uses the legacy `uc?export=download&confirm=<token>` query flow and carries no cookies between the two requests. Current Drive serves large-file downloads from `drive.usercontent.google.com` with a cookie-paired token. **This is exactly the spike I recommended and it was not de-risked** — room GLBs over ~100 MB may still fail. Test against a real >100 MB public file before trusting it. (Keeping files <25 MB per spec §5.6 sidesteps it — but C1 means there's no import path enforcing that anyway.)

---

## MEDIUM

- **M1** `/api/events` is unauthenticated and unbounded — anyone can POST arbitrary events (analytics poisoning); no cap on batch array length (loops `writeDataPoint` over N). Add a sane cap + basic origin/rate check.
- **M2** `room-loader` sets `checkCollisions = true` on **every** mesh; spec §5.6 says floor + walls only (per-mesh collision is a real perf cost).
- **M3** Replace-room versioning (spec §4.1.1) not enforced — overwriting a GLB in place on Drive would serve the stale cached copy for a year.
- **M4** In-scene video is a black plane (the "screen overlay synced via React portal" in the factory comment isn't implemented). Video *is* playable via the focus-panel iframe, so acceptable for MVP — but note it, since the 3D screen looks broken.

---

## What's genuinely good (keep)

- **Media proxy** — real `caches.default` match/put via `ctx.waitUntil`, only caches 200, slices Range from the full body. The #1 v1 bug is actually fixed (interstitial caveat H5 aside).
- **Scaler + pointer picking exist and are wired** at the interaction layer (the C4 desync is a fixable seam, not a missing feature).
- **CRUD ownership** is solid — 403 on non-owner, drafts hidden from non-owners, hotspot ownership via join.
- **Auth** uses PBKDF2 + JWT (correctly avoided bcrypt on Workers).
- **Analytics writes to AE, not D1.**
- Artwork factory branches image/video/audio; GLB validation logic is correct; guided tour correctly absent; sculpture correctly deferred; 68 tests pass.

---

## Suggested fix order

1. **B1** — make it compile (fix `.json<T>()`, the constructor syntax, the KTX config type, `artwork.hotspots`, unused imports).
2. **C2** — add `public/decoders/` + a build copy step, or rooms won't load.
3. **C3, C4** — parent frames to the artwork; make the interaction state machine authoritative so the scaler resets.
4. **C1** — build the actual authoring UI (Drive picker + ArtworkForm + gizmo placement + hotspot editor). This is the largest remaining chunk.
5. **H1–H4** — audio src field, hotspot audio wiring, warmCache-on-publish, engagement events.
6. **H5** — spike the Drive interstitial against a real large file.
7. **M1–M4** — hardening.
