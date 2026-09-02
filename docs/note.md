# Reda Gallery - Release Notes & Architecture Summary

## 1. Overview & Key Enhancements

This document summarizes the core features, responsive patterns, architecture decisions, and recent enhancements implemented for the Reda Gallery exhibition viewer and REDA Curator Studio Workbench across both Mobile and Desktop (PC) devices.

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

## 5. Audio System

### 5.0 Three-Track Audio Architecture
The gallery supports three independent audio layers that interact cleanly:

1. **Ambient Room Audio** — looping background audio attached to the exhibition; ducked to 8% volume when a focus-mode artwork has a narration guide, otherwise 35%.
2. **Artwork Audio Guide** — narration file attached per artwork; autoplays when focus mode opens (panel stays closed), controlled by a play/pause button below the info icon. The shared hidden `<audio>` element persists independently of the info panel so playback is never interrupted by opening/closing the modal.
3. **Dedicated Hotspot Audio** — a separate audio clip attached per hotspot; autoplays on hotspot select, stops on deselect, hotspot change, or inspect-mode exit.

### 5.1 Audio Guide Segment Timestamps (Hotspots)
- Each hotspot can now specify a **start → stop** time range in the main audio guide rather than playing to the end.
- Stored as `audio_timestamp_seconds` (start) and `audio_timestamp_end_seconds` (stop, optional) in `artwork_hotspots`.
- A `timeupdate` watcher pauses the guide at the stop time; the watcher is cleaned up on re-seek, hotspot change, and inspect exit.
- **Migration**: `migrations/0007_hotspot_audio_end.sql` (`ALTER TABLE artwork_hotspots ADD COLUMN audio_timestamp_end_seconds REAL`).
- Hotspot Editor UI shows a "Start … to … Stop" pair of number inputs.

### 5.2 Dedicated Hotspot Audio Autoplay
- Hotspots with `audio_file_id` autoplay their clip when the hotspot is selected.
- Keyed sidebar (`key={hotspot.id}`) causes a full remount per hotspot, so mount = autoplay, unmount = stop — no manual lifecycle wiring required.
- Mobile lightbox effect mirrors the same autoplay-on-change / stop-on-change behaviour.

### 5.3 Focus Mode Audio Controls
- A play/pause icon button appears **below the info icon** in the focus-mode header bar whenever the artwork has an audio guide.
- The button reflects the real playback state (subscribes to actual `<audio>` element events, not React state) so it stays in sync with the full AudioGuidePlayer controls inside the info panel.
- CSS: `.focus-header-bar__stack` (flex column, gap 10px) wraps the info and guide-toggle buttons.

### 5.4 Audio Bug Fixes
- **Ambient audio autoplay policy**: installs a one-time `click`/`keydown` retry listener when the browser blocks autoplay; listener is removed on unmount.
- **Seek audio not stopping**: `seekEndCleanupRef` (non-DOM ref) tracks the `timeupdate` watcher so it is cleaned up on re-seek, hotspot change, and inspect exit via an `onAudioStop` callback threaded through InspectLightbox.
- **React ref timing**: all stop-on-unmount effects capture the element before the cleanup runs (`const audio = ref.current; return () => audio?.pause()`) to avoid the null-ref trap.

---

## 6. Curator Studio & REDA Workbench (Recent Updates)

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
- [x] Code Simplification: Deduplicated `ArtistViewerPreview.tsx` via `DEVICE_CONFIG` pattern (-177 LOC).
- [x] Centering fixes: Virtual joystick knob centered via `translate(-50%, -50%)` and Focus header bar info icon centering across mobile and desktop.
- [x] Curator Atelier Sign In / Register Redesign: Dual-state mode switcher, atmospheric Florentine backdrop, gold medallion branding, and refined error handling.
- [x] Service Account Media Auth Migration (ADR-0001): Replaced public "anyone with link" access with private Service Account proxy (`/api/media/:fileId`) + HMAC-SHA256 tokens; simplified `DriveFilePicker` and removed dead `drive-share.ts`.
- [x] **Audio system** (2026-09-03): Three-track audio architecture (ambient, artwork guide, hotspot); ambient ducking; guide autoplays on focus entry with persistent hidden element; play/pause toggle button in focus header; hotspot audio guide segment (start→stop timestamps, migration 0007); dedicated hotspot audio autoplay; autoplay-policy retry; seek-audio stop-on-exit and React ref timing fixes.
- [x] **Hotspot editing** (2026-09-03): Clicking an existing pin now shows a pre-populated edit form (title, description, timestamps, audio file) with Save / Delete / Cancel. Added `PUT /api/hotspots/:id` route and `updateHotspot` db helper.
- [x] Complete automated test suite (**48 test files, 221 tests passing**) with 0 build errors.

### Future Enhancements (Backlog)
- [ ] **Multi-Waypoint Guided Tour**: Extend the single Start Point beacon into an ordered sequence of tour waypoints with camera path interpolation.
- [ ] **3D Sculpture Models**: Phase 2 support for placing interactive .glb / .gltf 3D sculptures on pedestals.

