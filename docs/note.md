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

## 7. Recent Enhancements & Design Refinements (2026-09-04)

### 7.1 White Flash Elimination (Pre-Entrance FOUC Fix)
- **Problem**: When entering the 3D exhibition, a momentary white screen flash occurred right before the entrance card / intro video rendered.
- **Fix**:
  - Injected dark background styling into `index.html` on `<html>` and `<body>` (`style="background-color: #0a0a0a; color-scheme: dark;"`), added `<meta name="color-scheme" content="dark" />`, `<meta name="theme-color" content="#0a0a0a" />`, and an early inline `<style>` block in `<head>`.
  - Removed the initial 300ms transparency window caused by `animation: fadeInOverlay 0.3s ease;` on `.intro-video-overlay` in `src/App.css`.
  - Added `backgroundColor: '#000000'` directly to `<video>` in `IntroVideoLoader.tsx` to prevent blank surface flash during Chromium hardware decoder initialization.

### 7.2 Complete Lucide Icons Migration (`lucide-react`)
- **Package Installation**: Added `lucide-react` to replace all custom, uncurated SVG glyphs and raw Unicode characters.
- **Unified Icon Component**: Re-architected `src/components/ui/Icon.tsx` into a type-safe Lucide component mapping 38+ registered names (`MousePointer2`, `Frame`, `MapPin`, `Box`, `User`, `Users`, `Settings`, `X`, `Volume2`, `VolumeX`, `Map`, `Maximize`, `Play`, `ZoomIn`, `Plus`, `ChevronRight`, `ExternalLink`, `Trash2`, `Film`, `Palette`, `AudioLines`, `Footprints`, `Mouse`, `Crosshair`, `Info`, `Search`, `RotateCcw`, `RotateCw`, `Minimize2`, `Maximize2`, `List`, `Pause`, `Smartphone`, `Lock`, `Shield`, `ArrowRight`, etc.).
- **Brand Mark Preservation**: Retained custom Google "G" multicolor mark for authentication (not bundled in Lucide).
- **Codebase Sweep**: Replaced all literal `×` close glyphs in `Inspector.tsx`, `ArtistInspector.tsx`, and `HotspotEditor.tsx` with `<Icon name="close" size={16} />`. Fixed button props in `ArtistInspector.tsx` and `ViewerErrorView.tsx`.
- **Testing**: Added unit test suite in `src/components/ui/Icon.test.tsx` verifying all icon names render valid SVG DOM trees.

### 7.3 Artist Quote Section Redesign (`design-taste-frontend`)
- **Editorial Museum Pull-Quote**:
  - Eliminated generic gray pill container (`background: rgba(255, 255, 255, 0.03)` with `border-radius: 0 12px 12px 0`) and clashing `#6366f1` indigo border.
  - Applied REDA signature `--reda-gold` in a crisp 2px vertical hairline (`border-left: 2px solid var(--reda-gold)`).
  - Applied atmospheric gold wash: `background: linear-gradient(90deg, rgba(185, 138, 60, 0.08) 0%, rgba(185, 138, 60, 0.02) 65%, transparent 100%)`.
  - Upgraded straight ASCII quotes (`" "`) to authentic typographic curved quotation marks: **“** and **”** in `--reda-display` (*Libre Bodoni*) with optical baseline alignments (`vertical-align: -3px` / `-6px`).
  - Set statement text in luminous `--reda-cream-hi` (`#F3EBD8`) in fluid *EB Garamond* italic with relaxed `1.55` line height.

### 7.4 Artist Modal 2-Column Layout & Full-Height Portrait
- **1:2 Grid Ratio (`grid-template-columns: 1fr 2fr;`)**:
  - Set `.artist-modal-content` to an exact 1:2 ratio across `ArtistViewerPreview.tsx`, `src/styles/reda-viewer.css`, and `src/App.css` (1 part portrait to 2 parts biography).
- **Full-Height Alignment (`align-items: stretch`)**:
  - Removed conflicting legacy rules in `App.css` with `align-items: start;` that previously caused the portrait column to prematurely collapse.
  - The portrait column now stretches to the exact height of the text/biography column (`height: 100%; min-height: 100%`).
- **Centering & Edge-to-Edge Column Presentation**:
  - Removed legacy `padding: 44px` on `.artist-modal-container` in `App.css` (set to `padding: 0; overflow: hidden;`), allowing the left column to span edge-to-edge without an awkward severed bottom border.
  - The avatar placeholder is centered both horizontally and vertically (`display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 0 auto;`).
  - Centered background lighting to `radial-gradient(circle at 50% 50%, var(--reda-char-2), var(--reda-wall-deepest))`.
  - For uploaded artist photos, the image spans full-bleed (`object-fit: cover; height: 100%; width: 100%`) with an elegant dark gradient bottom scrim overlaying the life dates and contact info.
- **Synchronized Across Studio & Public Viewer**:
  - Synchronized `ArtistViewerPreview.tsx` (Curator Workbench Preview) and `ArtistDetailModal.tsx` (Public Visitor Modal) with matching layout rules and tokens.

---

## 8. Current Status & Next Steps

### Completed & Verified
- [x] White flash elimination on 3D gallery entry before entrance card.
- [x] Full Lucide icon migration (`lucide-react`) across UI and Studio components.
- [x] Gallery-grade editorial quote redesign (`design-taste-frontend`).
- [x] Artist profile modal: 1:2 grid ratio (`1fr 2fr`) and equal-height portrait presentation.
- [x] Portrait placeholder true horizontal and vertical centering with edge-to-edge column presentation.
- [x] Complete test suite passing (**48 test files, 220 tests passed**) and zero TypeScript errors (`tsc -b --noEmit`).

### Future Enhancements (Backlog)
- [ ] **Multi-Waypoint Guided Tour**: Extend the single Start Point beacon into an ordered sequence of tour waypoints with camera path interpolation.
- [ ] **3D Sculpture Models**: Phase 2 support for placing interactive .glb / .gltf 3D sculptures on pedestals.

