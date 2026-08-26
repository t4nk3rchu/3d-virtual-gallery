# Blender Room Authoring Checklist

> Hand this to anyone creating a room GLB for the 3D Virtual Gallery platform.
> A room that passes this checklist imports and navigates correctly with no per-room fixes.

---

## Scale & Orientation

- [ ] **Units:** set to **metric, 1.0 scale** (Scene Properties → Units). 1 Blender unit = 1 metre.
- [ ] **Floor at Z = 0** in Blender (the exporter handles the up-axis swap → Y = 0 in the viewer).
- [ ] **Origin at visitor spawn point** — where the camera should start, not the mesh's geometric centre.
- [ ] **Room faces the entry direction** at spawn (visitor walks forward into the gallery).
- [ ] Doorways/ceilings tall enough for a **1.7 m eye height** with headroom (≥ 2.2 m clearance).

---

## Geometry & Naming

- [ ] Floor mesh named **`floor`** or **`ground`** (enables the viewer's collision + teleport heuristic).
- [ ] Walls are separate, closed geometry (no gaps a visitor can walk through).
- [ ] Decorative props are separate meshes (they skip per-mesh collision — keeps frame rate up).
- [ ] *(Optional)* hidden low-poly collision proxy named **`collider_*`** for complex geometry.
- [ ] **Apply all transforms** before export: Object → Apply → All Transforms.

---

## Materials & Lighting

- [ ] **Bake lighting into textures** (AO/shadows). The room is static; baked lighting is free at runtime.
- [ ] Textures reasonably sized (≤ 2K per map; 1K where it looks fine).
- [ ] Textures compressed to **KTX2/Basis** where possible.
- [ ] No reliance on scene lights in the viewer (only the ambient + per-artwork spotlight exists at runtime).

---

## Export Settings (glTF 2.0)

- [ ] Format: **glTF Binary (.glb)** — single file, not .gltf + .bin + textures.
- [ ] **Draco mesh compression** enabled.
- [ ] Include: Selected Objects (or the whole room collection), Materials, Textures.
- [ ] +Y up (default).
- [ ] Apply modifiers checked.

---

## Before Upload

- [ ] File size is **< 25 MB** (soft budget; hard cap 50 MB). If larger:
  - Decimate geometry
  - Shrink textures
  - Ensure Draco compression is on
- [ ] Opens correctly in a glTF viewer (e.g. [Babylon Sandbox](https://sandbox.babylonjs.com)) — floor at ground level, correct scale, no missing textures.
- [ ] Uploaded to Google Drive and set to **"Anyone with the link — Viewer"**.

---

## Common Mistakes

| Symptom | Likely cause |
|---|---|
| Camera clips through floor | Scale is not 1 unit = 1 m, or floor is not at Y = 0 |
| Visitor can walk through walls | Walls not tagged for collision (the viewer tags floor/ground; walls are always-on) |
| Room looks dark | Scene lights were relied on; bake lighting into textures |
| GLB fails to load | File > 50 MB, not a .glb (wrong magic bytes), or not public-link on Drive |
| Teleport lands outside room | Origin is not at the spawn point |

---

## Platform Library Rooms

All rooms provided by the platform must themselves pass this checklist. They are the reference examples curators copy and the standard visitors experience on opening night.
