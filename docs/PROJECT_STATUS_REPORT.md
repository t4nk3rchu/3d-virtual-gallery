# 🏛️ 3D Virtual Gallery — Project Status & Progress Report

**Document Date:** August 28, 2026  
**Project:** 3D Virtual Art Gallery Platform  
**Location:** `docs/PROJECT_STATUS_REPORT.md`  
**Test Suite Status:** 104 / 104 Tests Passing (`vitest run` across 15 test files)  
**Build Status:** Production Bundle Build Passing (`tsc -b && vite build`)  

---

## 1. 🚀 What's Running & Operational

| Component | Status | Port / Target | Details |
| :--- | :--- | :--- | :--- |
| **Vite Dev Server** | 🟢 Running | `http://localhost:5173` | React 19 Frontend with client-side routing (`/studio`, `/e/:slug`). Proxy configured to route `/api/*` to Worker. |
| **Cloudflare Worker** | 🟢 Running | `http://127.0.0.1:8787` | Local Worker API (`pnpm worker:dev`) serving CRUD, Auth, Media Proxy, and Analytics endpoints. |
| **Cloudflare D1 Database** | 🟢 Operational | Local & Remote | Database `virtual-gallery-db`. Migrations `0001` through `0005` applied to local SQLite and prepared for remote D1. |
| **Media & Proxy Engine** | 🟢 Operational | `/api/media/:fileId` | Dynamic caching proxy with Range request seeking, cache versioning (`?v=`), and pre-warming. |

---

## 2. 🛠️ What's Built & Added Recently

### 2.1. Artist Profiles & Solo/Group Curation Modes
- **D1 Database Migration (`migrations/0005_artists_and_intro_video.sql`):**
  - Created `artists` table with biography, life dates, quote block, portrait image ID, contact info, and sort ordering.
  - Added `curation_type` (`'solo' | 'group'`) and `intro_video_file_id` columns to `exhibitions`.
  - Added `artist_id` foreign key column to `artworks`.
- **Worker CRUD & Ownership Verification:**
  - Added `/api/exhibitions/:id/artists`, `POST /api/artists`, `PUT /api/artists/:id`, and `DELETE /api/artists/:id`.
  - Enforced strict tenant isolation (`getExhibitionOwner === auth.sub`) to prevent cross-curator leaks of draft artist profiles.
  - Automatically hydrated `artists` and artwork `artist_profile` objects in `getExhibitionById` and `getExhibitionBySlug`.
- **Studio Artist Management (`ArtistManagerModal.tsx`):**
  - Modal in Studio for adding, editing, and deleting artist profiles with live portrait image previews and Google Drive ID parsing.
  - Artwork form (`ArtworkForm.tsx`) dropdown to link artworks to artist profiles.
  - Solo vs. Group curation toggle: in Group mode, the curator artwork list automatically groups artworks by artist with count badges.

### 2.2. Fullscreen Artist Detail Profile Modal (`ArtistDetailModal.tsx`)
- Fullscreen modal for gallery visitors featuring artist portrait, lifespan years badge, highlighted quote block, structured biography paragraphs, and contact information.
- Triggered seamlessly via:
  - `👤 Read Artist Bio →` button in the Roam `FocusPanel.tsx`.
  - `👤 About {Artist}` pill button in the Inspect Lightbox header (`InspectLightbox.tsx`).

### 2.3. Intro Video Loader (`IntroVideoLoader.tsx`)
- Plays a 5–10s intro video clip over the initial gallery loading sequence.
- **Autoplay Security Policy Handling:** Attempts unmuted playback first; if blocked by the browser, it seamlessly falls back to muted autoplay and displays a `🔊 Bật âm thanh / Enable sound` button.
- **Scene Readiness & Skip Button:** Preloads 3D meshes in the background. Displays an `Enter Exhibition ➔` skip button as soon as the 3D room is ready.
- **Dual-Condition Sync:** Automatically transitions into the 3D gallery as soon as both the video has ended and the 3D scene is ready.

### 2.4. Viewer Inspect Mode Polish & Museum Aesthetics
- **Hotspot Panel Minimize Button & Glassmorphic Floating Card:**
  - Added `🗕 Minimize` / `🗖 Expand` toggle on the active hotspot details panel.
  - Minimized state auto-fits text height into a compact frosted glass floating card (`backdrop-filter: blur(24px); background: rgba(13, 17, 28, 0.78)`).
- **Museum Radial Spotlight Background & 3D Shadow:**
  - Upgraded inspect background from flat black to a museum spotlight gradient (`radial-gradient(circle at 50% 45%, #182234 0%, #0a0e18 45%, #030509 100%)`).
  - Added soft multi-layer ambient drop shadow behind the tilted 3D artwork slab.

### 2.5. Hotspot Flight Animations & 2D Canvas Simulation
- **Modular Animation Engine (`src/lib/viewer/hotspot-animations.ts`):**
  - 5 transition presets: `smooth_glide`, `cinematic_arc`, `zoom_fade`, `dramatic_whip`, `step_cut`.
  - Softened `cinematic_arc` flight dip to a gentle ~22% arc (`midS * 0.78`).
- **Interactive 2D Preview Widget (`HotspotTransitionPreview.tsx`):**
  - Real-time 2D canvas simulation embedded in the Studio Hotspot Editor displaying flight path, camera orientation, and scale dynamics.

### 2.6. Exhibition Metadata Editing & Cache Versioning
- **Migration `0004_artwork_updated_at.sql`:**
  - Added `updated_at` column to `artworks` with automatic timestamp bumping on DB updates.
  - Implemented DB column whitelist in `worker/db.ts` and `exhibition-patch.ts`.
- **Cache Busting Strategy:**
  - Versioned media URLs (`?v=<updated_at>`) ensuring instant asset refresh on edits while maintaining high edge cache hit rates.

### 2.7. Visitor Settings & Keybindings Modal (`SettingsModal.tsx`)
- In-viewer settings dialog allowing visitors to customize walk speed, mouse look sensitivity, FOV, and interactive keybinding recording with localStorage persistence.

---

## 3. 🛠️ Recent Fixes & Security Hardening

1. **Cross-Curator Artist Data Isolation (`worker/routes/crud.ts`):**
   - Secured `GET /api/exhibitions/:id/artists` behind `getExhibitionOwner(env, exhibitionId) === auth.sub` check so curators cannot access private or draft artist details belonging to other curators.
2. **Dual-Condition Sync in Intro Video (`IntroVideoLoader.tsx`):**
   - Added `useEffect([videoEnded, isSceneReady])` ensuring the viewer seamlessly transitions into the gallery even if a short video finishes before the 3D meshes finish loading.
3. **Autoplay Policy Handling:**
   - Handled browser `NotAllowedError` during unmuted autoplay attempts with instant muted fallback and interactive sound toggle prompt.
4. **Cinematic Arc Flight Curve Refinement:**
   - Softened flight altitude dip in `hotspot-animations.ts` for natural camera movement.
5. **Procedural Frame Normalization:**
   - Prevented degenerate 1.0m box slabs when `frameWidth` is 0.

---

## 4. 🧪 Test & Verification Summary

- **Vitest Suite:** `104 / 104 tests passing` (`vitest run` across 15 test files):
  - `worker/routes/crud.test.ts` (4 tests)
  - `worker/db.test.ts` (3 tests)
  - `src/lib/viewer/hotspot-animations.test.ts` (16 tests)
  - `src/lib/studio/studio.test.ts` (13 tests)
  - `src/lib/media/gdrive.test.ts` (12 tests)
  - `src/lib/media/youtube.test.ts` (11 tests)
  - `worker/auth.test.ts` (11 tests)
  - `worker/media-proxy.test.ts` (8 tests)
  - `src/components/viewer/fallback.test.tsx` (7 tests)
  - `src/lib/babylon/resolution-scaler.test.ts` (6 tests)
  - `src/components/viewer/viewer.test.tsx` (4 tests)
  - `src/lib/babylon/frame-builder.test.ts` (3 tests)
  - `src/lib/babylon/camera-controller.test.ts` (3 tests)
  - `worker/events.test.ts` (2 tests)
  - `src/lib/babylon/interaction.test.ts` (1 test)
- **Production Build:** `pnpm build` (`tsc -b && vite build`) passing cleanly with 0 type errors.

---

## 5. ⏳ Upcoming Roadmap & Next Steps

- [ ] **Studio Analytics Dashboard UI:** Visual charts in Studio displaying visitor counts, dwell time, and hotspot interaction metrics.
- [ ] **3D Sculpture & Pedestal Support (`SCULPTURE_3D`):** Loading standalone 3D `.glb` assets onto gallery pedestals with turntable inspect.
- [ ] **Multiplayer Visitor Presence:** Cloudflare Durable Objects + WebSockets for visitor avatars and live presence indicators.
- [ ] **Live Curator Guided Tours:** Presenter-led tours with synchronized camera viewing via WebRTC.
- [ ] **Custom Domain & Cloudflare Pages Production Deployment:** Cloudflare Pages + D1 production binding and custom DNS routing.

---

## 6. 📁 Key Source Files Reference

- **Artist Profile Modal:** [`src/components/viewer/ArtistDetailModal.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/ArtistDetailModal.tsx)
- **Intro Video Loader:** [`src/components/viewer/IntroVideoLoader.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/IntroVideoLoader.tsx)
- **Studio Artist Manager:** [`src/components/studio/ArtistManagerModal.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/studio/ArtistManagerModal.tsx)
- **Inspect Lightbox & Hotspots:** [`src/components/viewer/InspectLightbox.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/InspectLightbox.tsx)
- **Hotspot Animations Engine:** [`src/lib/viewer/hotspot-animations.ts`](file:///d:/Claude/3D%20Virtual%20Gallery/src/lib/viewer/hotspot-animations.ts)
- **Hotspot 2D Preview Widget:** [`src/components/studio/HotspotTransitionPreview.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/studio/HotspotTransitionPreview.tsx)
- **3D Viewer Component:** [`src/components/viewer/ExhibitionViewer.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/viewer/ExhibitionViewer.tsx)
- **Studio CMS & Dashboard:** [`src/components/studio/StudioApp.tsx`](file:///d:/Claude/3D%20Virtual%20Gallery/src/components/studio/StudioApp.tsx)
- **Worker CRUD & Endpoints:** [`worker/routes/crud.ts`](file:///d:/Claude/3D%20Virtual%20Gallery/worker/routes/crud.ts)
- **Database Migrations:** [`migrations/0004_artwork_updated_at.sql`](file:///d:/Claude/3D%20Virtual%20Gallery/migrations/0004_artwork_updated_at.sql), [`migrations/0005_artists_and_intro_video.sql`](file:///d:/Claude/3D%20Virtual%20Gallery/migrations/0005_artists_and_intro_video.sql)
