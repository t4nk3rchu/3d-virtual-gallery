# 3D Virtual Gallery - Release Notes & Architecture Summary

## 1. Overview & Key Enhancements

This document summarizes the core features, responsive patterns, architecture decisions, and recent enhancements implemented for the 3D Virtual Gallery exhibition viewer and REDA Curator Studio Workbench across both Mobile and Desktop (PC) devices.

---

## 2. 3D Roam & Locomotion

### 2.1 Desktop Navigation & Gravity
- **Locomotion**: WASD / Arrow keys for camera translation, mouse drag for camera look/rotation.
- **Continuous Floor Raycasting & Gravity**: The camera controller casts a downward ray on every frame to detect floor meshes beneath the visitor. When stepping off elevated objects (chairs, pedestals, benches, or steps), the camera smoothly falls back down to visitor eye level (`floorY + eyeHeight`) with gravity acceleration, preventing permanent height lock.
- **Control Bar**: Desktop control hints pinned at the bottom-left (`WASD to move · Drag to look · Click art to focus`).
- **Interactive Artwork Hover**: Moving the pointer over any 3D artwork mesh displays a translucent glassmorphic tooltip with Artist Name and Artwork Title.

### 2.2 Mobile Navigation
- **Virtual Joystick**: Dual-axis touch joystick rendered in the bottom-left quadrant on mobile devices (`window.innerWidth <= 768 || window.innerHeight <= 520`).
- **Touch Look**: Single-finger drag rotates the camera orientation.
- **Hidden Desktop Hints**: Desktop WASD hint bar is automatically hidden on mobile viewports to prevent UI clutter.

---

## 3. Focus Mode (90° Straight-On View)

- **Compact Top-Right Header Bar**:
  - Artist Name & Quoted Title: `Artist Name - “Artwork Title”`.
  - Circular `ℹ` Info toggle button.
  - `✕ Exit detail view` button.
- **Side Rail Navigation**: Floating `⏮` Previous and `⏭` Next buttons for flying the camera between adjacent artworks in the gallery room.
- **Metadata Popover Modal**: Toggling `ℹ` opens an info card containing:
  - Title, Year, Medium, Dimensions, and Description.
  - `👤 Read Artist Bio →` button for linked artist profiles.
  - Audio guide player (if available).
  - `🔍 Inspect Full Resolution →` button to open the Inspect Lightbox.
- **Mobile Responsive Actions**: On mobile viewports, the Bio and Inspect action buttons are fixed and responsive at the bottom of the screen.

---

## 4. Full-Resolution Inspect Lightbox

### 4.1 Full-Bleed Canvas & Zero Layout Shifting
- `.inspect-lightbox__main-area` is anchored to `position: absolute; inset: 0`.
- The artwork canvas stays permanently centered; expanding/collapsing descriptions, opening menus, or navigating hotspots will **never** push or shift the artwork position.

### 4.2 Mobile Inspect Mode
- **Zero Background Bars**: Top header and bottom controls have no opaque or gradient bars (`background: none; box-shadow: none`).
- **Dynamic Context Header**: Swaps between artwork overview and clamped hotspot descriptions with slide-down expansion and subtle screen dimming.
- **Inline Audio Player**: Audio toggle directly inside the bottom navigation pill.
- **Hotspots Directory**: Slide-over right drawer (`.inspect-lightbox__drawer`).

### 4.3 Desktop (PC) Inspect Mode
- **Persistent Header**: Preserves Artwork Title, Artist Name, and profile links.
- **Dedicated Floating Sidebar**: Hotspot Detail badge, Title, Full Description, Audio Player, and Timestamp Jump.
- **`🗕 Minimize` / `🗖 Expand` & Drag-to-Move**: Collapses into a draggable card with screen boundary clamping.

---

## 5. Curator Studio & REDA Workbench (Recent Updates)

### 5.1 Mode Isolation (`Artworks` | `Waypoints` | `Walkthrough`)
- **`Artworks` Mode**:
  - Dedicated to wall placement, gizmo translation, rotation, and proportional aspect-ratio locked scaling.
  - Start point and tour waypoints are hidden to avoid accidental click interference.
  - Toolbar actions: `Move`, `Rotate`, `Scale` (with `Lock Ratio`), and `Frame Artwork`.
- **`Waypoints` Mode**:
  - Dedicated to setting the visitor entry spawn point and tour guide paths.
  - Displays the 3D interactive gold beacon with directional arrow and eye-level marker.
  - Artwork meshes are non-pickable in this mode to allow easy floor placement and vantage testing.
  - Toolbar actions: `Move Position`, `Rotate Facing`, and `📍 Set at Camera`.
- **`Walkthrough` Mode**:
  - Distraction-free first-person walk mode within the workbench with active floor gravity and collisions.

### 5.2 Artworks Catalogue & Storage System
- **In Room vs. Storage Tabs**:
  - **`In Room (N)`**: Displays placed artworks rendered in the 3D gallery.
  - **`Storage (M)`**: Displays unplaced artworks saved in storage for later curation.
- **Placement Status & Actions**:
  - `📦 Move to Storage`: Unplaces the artwork from the 3D space.
  - `📍 Place in Room`: Places the stored artwork back onto gallery walls.
  - `🗑️ Delete Artwork`: Permanently deletes the artwork via `DELETE /api/artworks/:id` with confirmation.

### 5.3 3D Start Point (Visitor Spawn)
- Persisted in exhibition `settings_json` as `{ start_point: { position, rotation, target } }`.
- Readout in `SetupSheet.tsx` with one-click `Reset to Default` capability.
- Automatic fallback to room GLB spawn coordinates if custom start point is not defined.

### 5.5 REDA Design System Foundations & Curation Upgrades
- **Renaissance Codex Foundations**:
  - Implementation of core tokens (`--reda-gold`, `--reda-oxblood`, `--reda-sage`, `--reda-char-2`, `--reda-cream`, `--reda-wall-deep`).
  - Strict typography rules: Libre Bodoni (Didone display), Montserrat (labels, badges, kickers), and EB Garamond (reading body and quotes).
  - Cleaned up parchment sheets and modal drawers across `.reda-parch`, `.wb-sheet`, `.modal-card`, and `.studio-card`, eliminating muddy/creamy button backgrounds.
- **3D Perspective Tilt on 2D Artworks**:
  - Added `allowTilt?: boolean` in `FrameConfig` schema.
  - Added "Enable 3D Perspective Tilt in Inspect Mode" toggle in `ArtworkForm.tsx`.
  - Dynamically wired into `InspectLightbox.tsx` with hardware-accelerated 3D slab rotations.
- **Intro Cinema Transition Preview**:
  - Live 4-phase staged animation loop (`Video Playing` -> `Transitioning` -> `Inside 3D Space` -> loop) in `SetupSheet.tsx` with dedicated Replay button.
- **Artist Filtering & Navigation in Workbench**:
  - `ArtworksPane.tsx`: Added an Artist Filter dropdown allowing curators to filter both In Room and Storage works by specific artists or unassigned status.
  - `ArtistInspector.tsx`: Visual clickable cards displaying thumbnail, medium, and placement status with 1-click navigation into Curate mode with that artwork pre-selected.
- **Live Desktop (PC) & Mobile Landscape Visitor Previews**:
  - `ArtistViewerPreview.tsx`: Side-by-side flex layout with true centering and real-time reflection of curator edits.
  - Features authentic 3D gallery backdrop simulation and toggling between full 2-column Desktop PC view and compact Mobile Landscape view.

---

## 6. File Structure Reference

| File | Purpose |
| :--- | :--- |
| `src/styles/tokens.css` | Primitive & semantic design tokens (charcoal, parchment, gold, oxblood, state alerts). |
| `src/styles/reda-studio.css` | REDA brand stylesheet for Curator Dashboard, bento grids, login cards, and modals. |
| `src/styles/reda-workbench.css` | REDA Workbench 3-pane layout, resizer, inspector panels, and status bar styling. |
| `src/styles/reda-viewer.css` | REDA Visitor Viewer stylesheet (modal layouts, HUD, lightbox, responsive typography). |
| `src/lib/studio/artwork-placement.ts` | Utilities for managing placed vs. stored artworks (`isArtworkPlaced`, `setArtworkPlacement`). |
| `src/lib/studio/spawn-point.ts` | Serialization, parsing, and formatting for 3D starting vantage points. |
| `src/lib/babylon/spawn-beacon.ts` | Interactive 3D beacon mesh (floor ring, arrow, eye-level marker) for waypoints mode. |
| `src/lib/babylon/camera-controller.ts` | 3D locomotion, floor raycast gravity, arc-dip transitions, and spawn vantage point application. |
| `src/lib/babylon/artwork-factory.ts` | 3D mesh generator for 2D Images, Video screens, Audio emitters, frames, and placards. |
| `src/components/studio/workbench/Workbench.tsx` | Main curator shell orchestrating modes, left tool rail, inspector, and 3D canvas. |
| `src/components/studio/workbench/WorkbenchTopBar.tsx` | Top bar with mode switcher (`Artworks`, `Waypoints`, `Walkthrough`) and publishing controls. |
| `src/components/studio/workbench/ArtworksPane.tsx` | Left pane hosting `In Room` and `Storage` catalog tabs with Artist filtering. |
| `src/components/studio/workbench/ArtistsPane.tsx` | Left pane hosting artist profiles archive. |
| `src/components/studio/workbench/ArtistInspector.tsx` | Artist profile editor with interactive assigned works and 1-click Curate navigation. |
| `src/components/studio/workbench/ArtistViewerPreview.tsx` | Live PC and Mobile Landscape preview of visitor artist dossier over gallery scene. |
| `src/components/studio/ArtworkForm.tsx` | Form for artwork metadata, frame settings, 3D tilt option, placement toggles, and deletion. |
| `src/components/studio/GizmoPlacement.tsx` | Interactive 3D Babylon canvas with gizmos, beacon controls, and mode listeners. |
| `src/components/viewer/ExhibitionViewer.tsx` | Main 3D public viewer page with custom spawn, gravity, and placed artwork filtering. |
| `src/components/viewer/InspectLightbox.tsx` | Full-resolution inspect stage, 3D tilt, hotspot navigator, and responsive HUDs. |

---

## 7. Current Status & Next Steps

### Completed & Verified
- [x] REDA Design System Foundations (Renaissance Codex aesthetic, typography tokens, zero creamy buttons).
- [x] 3D perspective tilt slab on 2D artworks with curator-level toggle.
- [x] Paced 4-stage intro cinema live transition preview in curator workbench.
- [x] Artist filtering across In Room and Storage catalogs.
- [x] Interactive artist assigned works with 1-click curate mode editing navigation.
- [x] Authentic Desktop PC and Mobile Landscape live visitor previews in Artists mode.
- [x] Full mobile dynamic scaling and responsive audit.
- [x] Continuous floor raycasting and gravity fall-down for visitor camera.
- [x] 3D Start Point / Visitor Spawn placement and persistence.
- [x] Complete automated test suite (**43 test files, 200 tests passing**) with 0 build errors.

### Future Enhancements (Backlog)
- [ ] **Multi-Waypoint Guided Tour**: Extend the single Start Point beacon into an ordered sequence of tour waypoints with camera path interpolation.
- [ ] **3D Sculpture Models**: Phase 2 support for placing interactive .glb / .gltf 3D sculptures on pedestals.

