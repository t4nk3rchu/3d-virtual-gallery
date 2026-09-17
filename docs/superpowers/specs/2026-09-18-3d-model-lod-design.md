# 3D Model Level-of-Detail (LOD) — Design Spec

**Date:** 2026-09-18
**Status:** Approved design, pending implementation plan
**Amends:** `docs/superpowers/specs/2026-09-04-3d-model-support-design.md` (the base `MODEL_3D` feature). This spec adds the roam-scaling strategy that base spec left open ("assumes a handful of sculptures, not dozens").

---

## 1. Problem

The base `MODEL_3D` design loads **every** model's proxy at room entry. With many sculptures in one room this hurts the two loads the visitor actually feels:

1. **Initial room entry** — the wait before the room is walkable. Every proxy loads upfront.
2. **Pop-in while walking** — hitches as geometry streams in mid-roam.

The fix is a game-style **level-of-detail (LOD)** ladder: stop loading geometry at entry. Show a cheap stand-in immediately, stream real geometry in by distance, and unload it when the visitor leaves so memory stays bounded.

### Goals
- Room walkable near-instantly regardless of sculpture count.
- Smooth streaming: no empty gaps, no unbounded memory growth on a long tour.
- No extra curator work — every stand-in is auto-generated at upload.
- Reuse the base `MODEL_3D` pipeline (proxy, full model, 360 viewer, hotspots) unchanged; this is an amendment, not a rewrite.

### Non-goals (deferred)
- Imposter angle **blending** — v1 samples the nearest atlas cell (angles "snap" as you circle; acceptable at distance).
- LRU / keep-a-few proxy caching — v1 unloads on retreat (hysteresis only).
- Server-side imposter baking — capture runs in-browser at upload, like decimation.
- Imposter relighting — the atlas is baked under fixed neutral lighting; no runtime relight.

---

## 2. The LOD ladder

Three tiers of the same sculpture. Exactly one is active per sculpture at a time (T2 is a separate full-screen mode).

| Tier | What it is | Loaded when | Disposed when |
| :--- | :--- | :--- | :--- |
| **T0 Imposter** | Octahedral atlas billboard: one camera-facing quad + a sampling shader that picks the atlas cell matching the current view direction. | **All** models, at room entry. Always the fallback. | Never during roam (it is the resting state). |
| **T1 Proxy** | The decimated Draco `.glb` (≤15k tris) from the base spec. | Camera within `D_load` **and** the model is inside an **expanded** view frustum. | Camera beyond `D_unload` (`D_unload > D_load`). Reverts to T0. |
| **T2 Full** | Full-detail `.glb` in `Model360Viewer`. | On inspect (existing base-spec flow). | On viewer close (existing). |

**Hysteresis:** load and unload distances differ (`D_load < D_unload`) so a visitor lingering at the boundary does not thrash the proxy in and out. Concrete starting values (tunable): `D_load ≈ 6m`, `D_unload ≈ 9m`. These are gallery-scale defaults to calibrate against a real room — treat them as knobs, not constants.

**Swap without gaps:** when a proxy load completes, the imposter stays visible until the proxy mesh is ready, then they cross-toggle in one frame. The visitor never sees empty space.

---

## 3. What gets generated at upload

The curator picks **one** `.glb`. In the background the browser, in one pass, produces **two** derived files (in addition to using the picked file as the full model):

1. **Proxy `.glb`** — decimate + Draco compress (base spec, unchanged).
2. **Imposter atlas PNG** — render the model from an octahedral grid of directions (~64 cells: full sphere, so pitch is covered as well as yaw) into a single atlas texture. Grid dimensions (e.g. 8×8) are baked into the file/record so the runtime shader knows how to sample it.

Upload sequence per model: **fetch full `.glb` once → decimate → proxy** and **snapshot octahedral atlas → imposter PNG → upload both derived files**. A progress indicator covers the whole pass. This runs only in Studio; the curator never re-uploads anything.

**Capture lighting:** the atlas is rendered under fixed neutral lighting close to the gallery's roam ambient, to minimize the brightness "pop" when T0 swaps to the lit T1 proxy. This is a mitigation, not a guarantee — tune during QA.

---

## 4. Where the generated files are stored

**Both derived files live in the curator's own Google Drive**, alongside the picked `.glb`. No new storage system (no R2, no D1 blobs) — the same place every existing image/video/audio artwork already comes from, served at runtime through the existing `/api/media` proxy.

### 4.1 The upload helper (new capability)

Today the app only ever **reads** files the curator picked; there is **no code that writes to Drive**. This feature adds that for the first time. The mechanism is already half-present:

- The Drive picker holds an OAuth token with scope **`drive.file`** (`src/lib/studio/google-picker.ts`, the `scope` in the token request). That scope permits **creating new files** and managing files the app created — not only reading picked files. No new scope or consent screen is required.
- `shareFileWithServiceAccount(fileId)` (`src/lib/studio/google-picker.ts`) already exists — the exact path a picked file takes so the Worker's service account can serve it.

**New:** a small multipart-upload helper in `google-picker.ts`:

```
uploadDriveFile(bytes: Uint8Array, name: string, mimeType: string): Promise<string>  // returns new fileId
```

It POSTs to `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` using the cached `drive.file` token and returns the new file id. Both derived files (proxy `.glb`, imposter `.png`) go through it.

### 4.2 Round trip per derived file

```
generate bytes (decimate / capture)
  → uploadDriveFile(bytes, name, mime)         → fileId          (new helper, §4.1)
  → shareFileWithServiceAccount(fileId)                          (existing)
  → store on artwork: model_proxy_file_id / model_imposter_file_id
  → served at runtime via /api/media proxy                       (existing)
```

Identical to how a picked image is served; the only new step is the write.

---

## 5. Data model additions

On top of the base spec's `model_proxy_file_id` (artworks) and `anchor_3d_json` (hotspots):

### `Artwork`
- **New:** `model_imposter_file_id: string | null` — the auto-generated octahedral atlas PNG Drive file id.

### Atlas grid metadata
The octahedral grid dimensions (cells per axis) needed to sample the atlas. Baked into the artwork record (simplest: a small JSON/int on the artwork, or a fixed project-wide constant if the grid never varies in v1). **v1 uses a fixed grid constant** (no per-artwork variation) to avoid a schema field; revisit only if variable grids are needed.

### Migration
Extends the base spec's migration (or a follow-on migration) to add `model_imposter_file_id` to `artworks`. Worker CRUD (`worker/db.ts`, `worker/routes/crud.ts`) reads/writes the new column.

---

## 6. Runtime components (isolation)

| Unit | Purpose | WebGL? | Testability |
| :--- | :--- | :--- | :--- |
| `octahedral-math.ts` | `dirToAtlasCell(viewDir, gridN)`, `cellToUV(cell, gridN)` — map a view direction to an atlas cell and its UV rect. | No | **Pure, unit-tested.** |
| `lod-manager.ts` | Pure state machine: `(cameraPos, models[], currentTiers, thresholds) → actions[]` (`loadProxy` / `unloadProxy` / `showImposter` / `hideImposter`). Owns hysteresis + the expanded-frustum load gate as a predicate. | No | **Pure, unit-tested — the brain of the feature.** |
| `imposter-capture.ts` (studio) | Render the model from the octahedral grid into an atlas; return PNG bytes + grid metadata. | Yes | Grid math pure; render is smoke-tested. |
| `imposter-material.ts` (viewer) | Build the billboard plane + `ShaderMaterial` that samples the atlas by camera-relative view direction (nearest cell in v1). | Yes | Smoke-tested. |
| `model3d-factory.ts` (extends base) | On init spawn the imposter (T0) and register the model with the LOD manager; lazy-load/dispose the proxy (T1) on the manager's actions. | Yes | Smoke-tested; logic delegated to `lod-manager.ts`. |
| `model-upload.ts` (extends base) | Also generate + upload the imposter atlas via the §4.1 helper; store both file ids. | No (mocks) | Unit-tested with mocks. |
| Schema + migration + Worker CRUD | `model_imposter_file_id` column read/write. | No | Unit-tested. |

The one genuinely novel piece of code is the **octahedral sampling shader** in `imposter-material.ts`. Everything else is either reused, a pure module, or a thin WebGL shell over a pure module.

---

## 7. FOV / facing behavior

The visitor's original ask ("if the model is behind the camera, don't load/show it") splits into two mechanisms:

- **Rendering** (behind camera): Babylon **frustum-culls automatically** — an off-screen mesh is not drawn. Free, no code.
- **Loading** (the real optimization): `lod-manager.ts` only emits `loadProxy` when the model is within `D_load` **and** inside an **expanded** frustum (wider than the render frustum). The expansion means turning toward a nearby sculpture does not catch it unloaded — it began streaming slightly before it entered view.

---

## 8. Why this fixes both loads

- **Initial entry:** loads = room `.glb` + N small imposter atlas PNGs. No proxies, no full models. Room is walkable near-instantly.
- **Roam:** proxies stream in on approach and swap in on load-complete (imposter covers the gap); proxies dispose on retreat, so memory is bounded to the handful of sculptures near the visitor — directly addressing the mobile-memory concern that started this thread.
- **Per-frame cost:** the LOD manager runs a throttled distance/frustum check per model (~every 200ms or every N frames), not a per-frame raycast. Imposters are one textured quad each — negligible.

---

## 9. Performance budget

- **Entry payload:** room + imposter atlases only. Bounded and small.
- **Roam memory:** ≤ (proxies within `D_unload`) full at once; everything else is a quad + atlas.
- **Roam GPU:** render-on-demand unchanged; imposters and proxies are static meshes.
- **LOD tick:** O(models) distance + expanded-frustum test, throttled.
- **360 viewer:** one full model, disposed on close (base spec, unchanged).

---

## 10. Honest caveats (accepted for v1)

- **Angle snapping:** nearest-cell sampling means the imposter jumps between baked angles as you circle. Acceptable at distance; blending is a deferred upgrade.
- **Lighting pop:** baked imposter vs lit proxy can differ in brightness at the swap. Mitigated by neutral capture lighting; tune in QA.
- **Slower upload:** fetch + decimate + atlas render + two Drive writes. One-time, background, progress-barred.
- **First Drive write:** the app gains write access to Drive (§4.1). Scope already granted (`drive.file`); the helper only creates new files, never touches files it did not create.

---

## 11. Fit with the base plan

The base `MODEL_3D` plan (`docs/superpowers/plans/2026-09-04-3d-model-support.md`, 9 tasks) stays intact. This spec adds:

- **Task 1 (schema):** one column `model_imposter_file_id`.
- **Tasks 2 / 5 (decimation / upload):** also generate + upload the imposter atlas; add the `uploadDriveFile` helper (§4.1).
- **Task 4 (roam factory):** spawn the imposter, register with the LOD manager, lazy-load/dispose the proxy.
- **New modules:** `octahedral-math.ts`, `lod-manager.ts`, `imposter-capture.ts`, `imposter-material.ts`.

No base task is removed; the 360 viewer, hotspot editor, and hotspot math (base Tasks 3, 6, 7, 8) are unaffected.
