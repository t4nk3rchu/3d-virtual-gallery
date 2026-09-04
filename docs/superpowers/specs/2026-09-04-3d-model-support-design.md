# 3D Model Artwork Support — Design Spec

**Date:** 2026-09-04
**Status:** Approved design, pending implementation plan
**Feature:** Add `MODEL_3D` artworks to the gallery with the same two headline features as 2D images — 360° inspection and hotspots — without a second WebGL context leak or heavy roam-scene cost.

---

## 1. Overview

A `MODEL_3D` artwork is a `.glb` model (e.g. a sculpture) placed in the gallery. It reuses the existing artwork pipeline (placement, focus, placard, spotlight, hotspot data, audio) and adds only what's genuinely new: **3D hotspot anchoring** and **two new views** (a lightweight roam proxy and a dedicated 360° inspect viewer).

The performance strategy is the spine of the design: the curator uploads **one** `.glb`; the system auto-generates a low-poly **proxy** for roam, and loads the **full** model only inside the on-demand 360° viewer, disposing it on close.

### Goals
- `MODEL_3D` artwork type with the same authoring/placement UX as existing artworks.
- 360° inspection: orbit + zoom of the full-detail model in a dedicated viewer.
- Hotspots anchored to the model surface, reusing the existing hotspot data, editor, info card, and audio.
- Keep roam cheap even with several models in a room.
- One curator upload — no manually creating or uploading a second model.

### Non-goals (deferred)
- Decimation quality slider (fixed defaults in v1).
- KTX2 texture transcoding (Draco geometry compression only in v1).
- Animated/rigged models (static models only in v1).
- Server-side model processing (decimation runs in-browser at upload).
- Recompressing the full model — v1 serves the picked `.glb` as-is; only the proxy is generated and uploaded.
- Mobile touch-tilt of models in roam (360 viewer handles touch orbit; roam is walk-around only).

---

## 2. Data model

### `ArtworkType`
Add `'MODEL_3D'` (replaces the stubbed `SCULPTURE_3D` comment in `src/types/schema.ts`).

### `Artwork`
- `media_file_id` — holds the **full** `.glb` Drive file id (same field images/audio use).
- **New:** `model_proxy_file_id: string | null` — the auto-decimated proxy `.glb` Drive file id.

Both are Drive files served through the existing `/api/media` proxy path.

### `ArtworkHotspot`
- Existing `x_percent` / `y_percent` remain for 2D artworks.
- **New:** `anchor_3d_json: string | null` — JSON `{ p: [x,y,z], n: [x,y,z] }`: the surface **point** and **normal** in model-local space.
- A hotspot uses `x/y_percent` when its parent artwork is 2D, `anchor_3d_json` when `MODEL_3D`.

Storing the normal at authoring time makes runtime occlusion a cheap dot-product (no per-frame raycast).

### Migration
One D1 migration adds `model_proxy_file_id` to `artworks` and `anchor_3d_json` to `artwork_hotspots` (both nullable). Worker CRUD (`worker/db.ts`, `worker/routes/crud.ts`) extends create/update to read/write the new columns.

---

## 3. Authoring (Studio)

### 3.1 Upload → auto-proxy (one curator action)
1. Curator picks a `.glb` from Drive via the existing Google Drive Picker → sets `media_file_id` (nothing uploaded; already in Drive).
2. In the background, the browser **downloads** those bytes once (via the media proxy), **decimates** locally, and **uploads only the small proxy** `.glb` as a new Drive file → `model_proxy_file_id`. Both files are shared with the service account (existing path).
3. A progress indicator covers the fetch + decimate + upload. This runs only in the studio; the curator never manually re-uploads.

The one honest cost: the browser must fetch the full model once to decimate it — a one-time background download during authoring.

### 3.2 Decimation
- **Dependency:** `gltf-transform` (+ meshoptimizer), runs in WASM in-browser. Chosen over hand-rolling / Babylon's built-in simplifier for decimation quality and because the same pass Draco-compresses the proxy.
- **Fixed v1 targets:** ~50% triangle reduction capped at ≤15k triangles; textures downscaled to ≤1k. No quality slider in v1.
- The pass Draco-compresses the **proxy**. The **full** model (`media_file_id`) is used exactly as the curator picked it — v1 does not re-upload or recompress it (see non-goals). Curators can pre-optimize their source `.glb` if the 360 download is large.

### 3.3 Placement
Reuses the existing transform gizmo exactly. `MODEL_3D` defaults to floor/pedestal placement instead of a wall (same move/rotate/scale, same placard, `transform_json`).

### 3.4 3D hotspot editor
A new Studio mode loads the **full** model in a 3D view. The curator **clicks the model surface to drop a hotspot** — the raycast hit provides the local point + normal stored in `anchor_3d_json`. Title/description/audio use the **existing `HotspotEditor` form unchanged**. Editing/deleting reuses the current hotspot CRUD, plus the existing PUT `/api/hotspots/:id` extended to carry the 3D anchor.

---

## 4. Runtime (visitor)

### 4.1 Roam
A new `model3d-factory` (parallel to `artwork-factory`):
- Loads the **proxy** `.glb` (Draco-decoded via the self-hosted decoders).
- Places it on a pedestal at the stored `transform_json`.
- Reuses the existing placard, spotlight, and hover tooltip.

Clicking a sculpture → the existing **focus** flow (camera flies to it, info panel opens) → an **"Inspect in 360"** button (mirrors the 2D "Inspect Full Resolution").

### 4.2 360° viewer (`Model360Viewer`, parallel to `InspectLightbox`)
- A dedicated full-screen overlay with **its own Babylon engine + `ArcRotateCamera`**.
- On open: loads the **full** `.glb` with a progress bar.
- On close: **disposes the engine, model, and textures** — one full model in memory at a time. The transient second WebGL context is released on close, well under the context limit.
- Interaction: drag to orbit, pinch/scroll to zoom (clamped min/max radius), optional slow idle auto-spin.
- The roam engine idles (render-on-demand) behind the open viewer.

### 4.3 Hotspots in the 360 viewer
- Each frame, the stored 3D point projects to screen → a DOM pin (reuses existing pin styling + the hotspot list drawer).
- **Occlusion:** dot-product of stored normal vs. camera direction; pins facing away fade out (no raycast).
- **Zoom-adaptive size:** pin size is a clamped function of camera radius — large when the whole model is framed (so a hotspot is clearly noticeable), shrinking as the visitor zooms in so pins don't obstruct the surface. Bounded to `[minPx, maxPx]`.
- Clicking a pin or list item animates the camera to bring that point front-and-center (the 3D mirror of the 2D "camera flies to hotspot"), then opens the **existing** info card + audio (guide, hotspot audio, segment timestamps — all reused).

---

## 5. Performance budget

- **Compression at upload:** the `gltf-transform` pass Draco-compresses the proxy. The full model is served as picked (v1 does not recompress it).
- **Roam:** only the proxy is ever loaded (≤15k tris, textures ≤1k). Several sculptures stay light.
- **360 viewer:** full model loaded on open, disposed on close — one at a time. Transient second context released on close.
- **Rendering:** roam idles via render-on-demand while the viewer is open; the viewer renders while interacting/auto-spinning.
- **Hotspots:** per-frame dot-product for occlusion (no raycast); pin size clamped against camera radius.

---

## 6. Component breakdown (isolation)

| Unit | Purpose | Depends on |
| :--- | :--- | :--- |
| Schema + D1 migration | `MODEL_3D` type, `model_proxy_file_id`, `anchor_3d_json` | `src/types/schema.ts`, `worker/db.ts`, migrations |
| `model-decimation.ts` (Studio) | Fetch full → decimate → Draco-compress → produce the proxy `.glb` via `gltf-transform` | `gltf-transform`, media proxy, Drive upload |
| Model upload flow (Studio) | Wire decimation into the picker/upload path; store both file ids | `google-picker.ts`, `model-decimation.ts` |
| 3D hotspot editor (Studio) | Load full model, click-to-drop hotspots (point + normal), reuse `HotspotEditor` form | Babylon, existing hotspot CRUD |
| `model3d-factory.ts` (viewer) | Roam proxy mesh: load proxy, pedestal, placard, spotlight, tooltip | GLB loader, Draco decoders |
| `Model360Viewer.tsx` (viewer) | Dedicated 360 engine, orbit/zoom, full-model load/dispose, 3D hotspot projection/occlusion/zoom-scale, camera-to-hotspot | Babylon `ArcRotateCamera`, existing hotspot card + audio |
| Worker CRUD | Read/write new columns; PUT hotspot extended for 3D anchor | `worker/routes/crud.ts`, `worker/db.ts` |

---

## 7. Reuse map (shared with 2D, unchanged)

Hotspot payload (title/description/audio/timestamps), `HotspotEditor` form, hotspot info card, audio system (guide + hotspot audio + segment timestamps), focus-mode camera flight, transform gizmo, GLB loader + self-hosted Draco decoders, media/Drive plumbing, hotspot list drawer, pin styling.

---

## 8. New dependency

`gltf-transform` (+ meshoptimizer) — in-browser WASM decimation + Draco compression at upload. The one new dependency this feature requires.
