# Design Spec: Artist Profiles, Intro Video Loader, Glass Hotspot Card & Museum Spotlight

**Date:** 2026-08-28  
**Author:** Antigravity  
**Status:** Approved  

---

## 1. Overview & Goals

This specification covers four major enhancements to the 3D Virtual Gallery:
1. **Artist Profiles & Multi-Artist Curation System**: Curators can define rich artist profiles (Quote, Biography, Contact/Life dates, Portrait Photo / Monogram initials). In Solo or Group exhibitions, artworks link to artist records and visitors can open a fullscreen Artist Profile View directly from the artwork focus panel.
2. **Exhibition Intro Video Loader**: A 5–10s video clip stored on Google Drive plays during the initial 3D room asset load. Employs an unmuted autoplay strategy with fallback to muted + sound prompt, background 3D preloading, and a "Skip Intro" button once the 3D scene is ready.
3. **Collapsible Glassmorphic Hotspot Detail Panel**: In Inspect Mode, users can toggle between the full-height side drawer and a floating glass card sized dynamically to the text content, with frosted backdrop-filter glassmorphism.
4. **Radial Museum Spotlight & Soft Shadow Backdrop**: In Inspect Mode, replaces flat black backgrounds with a subtle radial spotlight gradient centered behind the 3D artwork frame and enhanced multi-layer depth drop shadows.

---

## 2. Architecture & Data Model

### A. Database Schema (`migrations/0005_artists_and_intro_video.sql`)

```sql
-- ─── Artists Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
  id                TEXT PRIMARY KEY,
  exhibition_id     TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  life_dates        TEXT,                       -- e.g. "1910 – 1994"
  quote             TEXT,                       -- Artist quote / philosophy
  biography         TEXT,                       -- Detailed bio / artist statement
  contact_info      TEXT,                       -- Optional contact / website / studio
  portrait_file_id  TEXT,                       -- Google Drive file ID for portrait
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ─── Exhibitions & Artworks Modifications ──────────────────────────────────────
ALTER TABLE exhibitions ADD COLUMN intro_video_file_id TEXT;
ALTER TABLE exhibitions ADD COLUMN curation_type TEXT NOT NULL DEFAULT 'solo'; -- 'solo' | 'group'
ALTER TABLE artworks ADD COLUMN artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL;
```

### B. TypeScript Interfaces (`src/types/schema.ts`)

```ts
export interface Artist {
  id: string;
  exhibition_id: string;
  name: string;
  life_dates?: string | null;
  quote?: string | null;
  biography?: string | null;
  contact_info?: string | null;
  portrait_file_id?: string | null;
  order_index: number;
  created_at: number;
}

export type ArtistInput = Omit<Artist, 'id' | 'created_at'>;

export interface ExhibitionDetail extends Exhibition {
  room: Room;
  artworks: (Artwork & { hotspots: ArtworkHotspot[]; artist_profile?: Artist | null })[];
  artists: Artist[];
  curation_type: 'solo' | 'group';
  intro_video_file_id?: string | null;
}
```

---

## 3. Component Details & Workflows

### 3.1. Artist Profile Modal (`src/components/viewer/ArtistProfileModal.tsx`)
- Renders fullscreen with dark glassmorphic styling and close button (matching design reference).
- Left column:
  - Header: `TÁC GIẢ / Artist Name`
  - Quote section in stylized italic serif.
  - Biography section (`TIỂU SỬ`).
  - Contact information (`LIÊN HỆ`).
- Right column:
  - Portrait photo card loaded via `proxyMediaUrl(artist.portrait_file_id)`.
  - Fallback to gold monogram initials badge (e.g. `VC`) if no portrait uploaded.
  - Life dates (e.g. `1910 – 1994`) and list of artworks by this artist in the exhibition.

### 3.2. Focus Panel Integration (`src/components/viewer/FocusPanel.tsx`)
- Adds a secondary action button below "Xem chi tiết" (Inspect):
  - **"Tìm hiểu về tác giả"** (Learn about the artist).
  - Clicking opens the `ArtistProfileModal` for the active artwork's artist.

### 3.3. Exhibition Intro Video Loader (`src/components/viewer/IntroVideoLoader.tsx`)

> **Infra constraint (all-Cloudflare stack):** the intro clip is served from Google Drive through the Worker media proxy (`proxyMediaUrl`), which caches the *whole* file on first fetch then serves Range slices from it. This is the one place Drive-served video is used (artwork video still goes to YouTube). To stay safe on this path — first-visitor stall, Drive's ~100 MB virus-scan interstitial, quota — the intro clip **must be short and small: ≤10 s and ≤20 MB** (target a few MB). The studio's `intro_video_file_id` input should reject/warn on files above this budget (same spirit as the GLB RoomImporter validation), or at minimum the guidance must be documented for curators. Do **not** use a full-length or high-bitrate video here.

- Mounted during the loading phase of `ExhibitionViewer.tsx`.
- **Autoplay & Audio Pipeline**:
  - `video.play()` called with `muted = false`.
  - If rejected (`NotAllowedError`), sets `video.muted = true` and `video.play()`, while showing a floating `"🔊 Bật âm thanh"` (Enable Sound) button.
- **Preload Handshake**:
  - Babylon engine loads 3D scene in background.
  - When `isSceneReady` is true:
    - If video has ended: seamlessly crossfades into 3D view.
    - If video is still playing: shows a pulsing `"Vào triển lãm →"` (Skip Intro) button in bottom right.
  - Clicking Skip (or video end) triggers 600ms crossfade to 3D canvas.

### 3.4. Collapsible Glassmorphic Hotspot Panel (`src/components/viewer/InspectLightbox.tsx`)
- Side panel header has a Mode Toggle icon button:
  - **Expanded Drawer Mode**: standard full-height sidebar.
  - **Compact Floating Card Mode**: collapses into a floating bottom-right glass card that auto-fits text height.
- Styled with `backdrop-filter: blur(16px); background: rgba(15, 20, 34, 0.78); border: 1px solid rgba(255, 255, 255, 0.12);`.

### 3.5. Radial Museum Spotlight & 3D Shadow (`src/components/viewer/InspectLightbox.tsx`)
- Replace flat `#000000` stage background with:
  ```css
  background: radial-gradient(circle at center, #1c2336 0%, #0d121f 50%, #05070c 100%);
  ```
- Slab shadow multi-layered for authentic exhibition depth:
  ```css
  box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.7), 0 0 120px rgba(96,165,250,0.08);
  ```

### 3.6. Studio Management (`src/components/studio/StudioApp.tsx` & `ArtistManager.tsx`)
- **Exhibition Settings**: Curation Type toggle (`Solo Exhibition` vs `Group / Multi-Artist`) and `intro_video_file_id` input field.
- **Artist Manager Component**: Create/edit artist entries (Name, Dates, Quote, Bio, Contact, Portrait).
- **Artwork Grouping**: In Group Exhibition mode, artworks in the studio table/list are grouped by artist.

---

## 4. API Endpoints (`worker/routes/crud.ts`)

- `GET /api/exhibitions/:id/artists`: List all artists for an exhibition.
- `POST /api/artists`: Create an artist entry (requires auth & ownership).
- `PUT /api/artists/:id`: Update an artist record (requires auth & ownership).
- `DELETE /api/artists/:id`: Delete an artist record.
- `PUT /api/exhibitions/:id`: Updated whitelist to support `intro_video_file_id` and `curation_type`.
- `PUT /api/artworks/:id`: Updated whitelist to support `artist_id`.

---

## 5. Verification Plan

1. **Unit Tests**:
   - `worker/routes/artists.test.ts`: CRUD operations, permissions, cascading exhibition deletion.
   - `src/components/viewer/artist-profile.test.tsx`: Modal rendering, portrait fallback monogram, quote/bio display.
   - `src/components/viewer/intro-video.test.tsx`: Autoplay fallbacks, skip button visibility, scene ready handshake.
2. **Build & Integration Tests**:
   - `pnpm build`: Verify TypeScript compilation across client and worker.
   - `pnpm test`: Full test suite pass with 100% green status.
