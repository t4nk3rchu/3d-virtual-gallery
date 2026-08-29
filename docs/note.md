# 3D Virtual Gallery - Release Notes & Architecture Summary

## 1. Overview & Key Enhancements

This document summarizes the core features, responsive patterns, and architecture decisions implemented for the 3D Virtual Gallery exhibition viewer and inspect mode on both Mobile and Desktop (PC) devices.

---

## 2. 3D Roam & Locomotion

### 2.1 Desktop Navigation
- **Locomotion**: WASD / Arrow keys for camera translation, mouse drag for camera look/rotation.
- **Control Bar**: Desktop control hints pinned at the bottom-left (`WASD to move · Drag to look · Click art to focus`).
- **Interactive Artwork Hover**: Moving the pointer over any 3D artwork mesh displays a translucent glassmorphic tooltip with:
  - Line 1: Bold Artist Name.
  - Line 2: Artwork Title, Year.

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
- **Dynamic Context Header**:
  - When viewing artwork overview: Displays Artwork Title & Artist.
  - When viewing a Hotspot: Swaps to `📍 Detail XX of YY`, Hotspot Title, and a 1-line clamped description with `... See more`.
- **Slide-Down Unfold & Screen Dimmer**:
  - Tapping `... See more` slides down full description text directly from the top header (`animation: slideDownDesc`).
  - Subtle screen dimmer (`background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(2px)`) darkens the background to enhance text legibility while keeping the artwork crisp and fully visible.
  - Dismissible via clicking the scrim, clicking `▴ See less`, or pressing `Esc`.
- **Inline Audio Player**: If the active hotspot has attached audio, an inline `🎧 Listen` / `⏸ Pause` toggle is rendered directly inside the bottom navigation pill.
- **Hotspots Directory**: Accessible via the top `📍 Hotspots List (N)` button, which opens a slide-over right drawer (`.inspect-lightbox__drawer`).

### 4.3 Desktop (PC) Inspect Mode
- **Persistent Header**: Preserves the complete Artwork Title, Artist Name, and `👤 About [Artist]` profile link.
- **Dedicated Floating Sidebar**:
  - Hotspot Detail badge and `✕` close button.
  - Hotspot Title & Full Description.
  - Dedicated Audio Player and Exhibition Guide Timestamp Jump action.
  - `◀ Prev` and `Next ▶` detail navigation.
- **`🗕 Minimize` / `🗖 Expand` & Drag-to-Move**:
  - Clicking `🗕 Minimize` collapses the sidebar into a compact card (`.inspect-lightbox__sidebar--minimized`).
  - Minimized card is freely draggable and moveable anywhere across the screen with pointer capture and screen boundary clamping.
- **Desktop Navigation Hints**: Bottom gradient bar with zoom, pan, and 3D tilt instructions.

---

## 5. File Structure Reference

| File | Purpose |
| :--- | :--- |
| `src/components/viewer/ExhibitionViewer.tsx` | Main 3D canvas viewer, locomotion orchestrator, and mode manager. |
| `src/components/viewer/VirtualJoystick.tsx` | Touch-based dual-axis virtual joystick for mobile devices. |
| `src/components/viewer/ArtworkHoverTooltip.tsx` | 3D Roam mode artwork hover tooltip. |
| `src/components/viewer/FocusPanel.tsx` | Focus mode top-right header bar, metadata modal, and nav rail. |
| `src/components/viewer/InspectLightbox.tsx` | Full-resolution inspect stage, 3D tilt, hotspot navigator, and responsive HUDs. |
| `src/components/studio/DriveFilePicker.tsx` | Google Drive Picker component with automatic sharing permission verification. |
| `src/lib/studio/google-picker.ts` | Direct programmatic Google Picker JS SDK controller. |
| `src/components/common/ErrorBoundary.tsx` | Global React Error Boundary for resilient client fault tolerance. |
| `src/lib/babylon/interaction.ts` | Raycasting, hover tracking, hotspot hit testing, and camera state transitions. |
| `src/lib/babylon/camera-controller.ts` | 3D flight paths, arc-dip transitions, and boundary constraints. |
| `src/App.css` | Glassmorphic design tokens, responsive media queries, and animations. |

---

## 6. Phase 1 Security Hardening & Studio Google Drive Integration

### 6.1 Backend Security Hardening
- **OAuth CSRF State Validation**: Added HMAC/JWT-backed `oauth_state` cookie (`HttpOnly; Secure; SameSite=Lax; Max-Age=600`) generated upon `/api/auth/google` redirect and strictly verified on `/api/auth/callback/google` with immediate cleanup upon completion.
- **Narrowed OAuth Scopes**: OAuth authorization requests reduced strictly to `openid email profile` (removed unneeded Drive scopes).
- **Rate-Limited Event Ingestion**: Cloudflare Worker binding `EVENTS_LIMITER` limits `/api/events` beacons to 120 req/min per IP, returning HTTP `429 Too Many Requests` on overflow with fallback safety.
- **Batched N+1 Query Optimization**: Hydration of artwork hotspots in `getExhibitionBySlug` and `getExhibitionById` batched via `WHERE artwork_id IN (...)` parameterized query, reducing DB round-trips from `O(N)` to `O(1)`.
- **Curator Team Permission Gating**: Added `is_team_member` flag to user accounts via D1 migration `0006_users_team_flag.sql`. Team members gain access to shared drives and shared-with-me folders in the studio.

### 6.2 Studio Google Drive Picker
- **Comprehensive Asset Coverage**: Available across all 7 media/file input fields in Studio:
  1. 2D Artwork Image (`ArtworkForm.tsx`)
  2. Audio Artwork Clip (`ArtworkForm.tsx`)
  3. Audio Guide Voiceover Narration (`ArtworkForm.tsx`)
  4. 3D Room GLB Model (`RoomImporter.tsx`)
  5. Intro Video (`StudioApp.tsx`)
  6. Artist Portrait Image (`ArtistManagerModal.tsx`)
  7. Hotspot Detail Audio Clip (`HotspotEditor.tsx`)
- **Direct Programmatic SDK**: Built on `window.gapi.load('picker')` and `google.accounts.oauth2.initTokenClient` in `google-picker.ts`, bypassing custom web-component wrappers for zero DOM layout shifting and rock-solid lifecycle stability.
- **Fail-Closed Permission Verification**: Automatically checks Google Drive API permissions on picked assets and rejects private files, alerting curators to ensure files are set to "Anyone with the link can view".
- **Global Centering & Error Boundary**: Styled `.picker-dialog` with fixed viewport centering and protected the application tree with `ErrorBoundary.tsx`.

