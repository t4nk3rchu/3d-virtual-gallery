# Artist Profiles, Intro Video Loader & Viewer Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full artist profile management (bio, quote, contact, portrait, solo vs multi-artist curation), exhibition intro video loader (unmuted autoplay fallback, background 3D preloading, skip button), collapsible glassmorphic hotspot detail panel, and radial museum spotlight backdrop for inspect mode.

**Architecture:** 
1. Database & Worker API: Add `artists` table, `intro_video_file_id` and `curation_type` on exhibitions, and `artist_id` on artworks. Hydrate artist data in exhibition public & detail endpoints.
2. Viewer: Add `ArtistProfileModal` triggered from `FocusPanel`, `IntroVideoLoader` masking 3D engine startup, and glassmorphic collapsible card & spotlight in `InspectLightbox`.
3. Studio: Add `ArtistManager` for curator management, artist grouping in `ArtworkManager`, and intro video / curation type controls in exhibition settings.

**Tech Stack:** TypeScript, React 19, Babylon.js 7, Cloudflare Workers + D1, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-artist-profiles-intro-video-and-viewer-enhancements-design.md`

## Global Constraints

- **Package manager:** `pnpm` (v11). Run tests with `pnpm test` (`vitest run`); build with `pnpm build` (`tsc -b && vite build`).
- **User Instruction on Git Commits:** Do NOT execute `git commit` until user explicitly verifies.
- **Single media URL chokepoint:** Use `proxyMediaUrl(fileId, version)` from `src/lib/media/gdrive.ts` for all media resolution.
- **Controlled inputs:** All `<select>` and `<input>` forms must gracefully support initial async load states and never null out required columns on partial patch.

---

### Task 1: D1 Migration & Database Layer (Artists, Intro Video, Curation Type)

**Files:**
- Create: `migrations/0005_artists_and_intro_video.sql`
- Modify: `src/types/schema.ts`
- Modify: `worker/db.ts`
- Test: `worker/db.test.ts`

**Interfaces:**
- Produces:
  - `interface Artist`: `{ id, exhibition_id, name, life_dates, quote, biography, contact_info, portrait_file_id, order_index, created_at }`
  - `getArtistsForExhibition(db, exhibitionId): Promise<Artist[]>`
  - `createArtistRecord(db, input: ArtistInput): Promise<Artist>`
  - `updateArtistRecord(db, id, patch: Partial<ArtistInput>): Promise<boolean>`
  - `deleteArtistRecord(db, id): Promise<boolean>`
  - Whitelists: `EXHIBITION_UPDATE_COLS` includes `intro_video_file_id`, `curation_type`; `ARTWORK_UPDATE_COLS` includes `artist_id`.

- [ ] **Step 1: Write the failing test for DB helpers and migration in `worker/db.test.ts`**

```ts
it('creates, retrieves, updates and deletes artist records', async () => {
  const artist = await createArtistRecord(db, {
    exhibition_id: exId,
    name: 'Trần Văn Cẩn',
    life_dates: '1910 - 1994',
    quote: 'Art is the essence of life',
    biography: 'Renowned Vietnamese master painter.',
    contact_info: 'Hanoi, Vietnam',
    portrait_file_id: 'drive_portrait_123',
    order_index: 0,
  });
  expect(artist.id).toBeDefined();
  expect(artist.name).toBe('Trần Văn Cẩn');

  const list = await getArtistsForExhibition(db, exId);
  expect(list.length).toBe(1);
  expect(list[0].quote).toBe('Art is the essence of life');

  const updated = await updateArtistRecord(db, artist.id, { quote: 'Updated quote' });
  expect(updated).toBe(true);

  const deleted = await deleteArtistRecord(db, artist.id);
  expect(deleted).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run worker/db.test.ts`
Expected: FAIL due to missing functions / schema table.

- [ ] **Step 3: Create SQL migration `migrations/0005_artists_and_intro_video.sql` and apply to local D1**

```sql
CREATE TABLE IF NOT EXISTS artists (
  id                TEXT PRIMARY KEY,
  exhibition_id     TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  life_dates        TEXT,
  quote             TEXT,
  biography         TEXT,
  contact_info      TEXT,
  portrait_file_id  TEXT,
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

ALTER TABLE exhibitions ADD COLUMN intro_video_file_id TEXT;
ALTER TABLE exhibitions ADD COLUMN curation_type TEXT NOT NULL DEFAULT 'solo';
ALTER TABLE artworks ADD COLUMN artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL;
```

- [ ] **Step 4: Update `src/types/schema.ts` and implement DB helper functions in `worker/db.ts`**

Add `Artist`, `ArtistInput`, and updated `Exhibition` / `Artwork` types. Implement `createArtistRecord`, `getArtistsForExhibition`, `updateArtistRecord`, `deleteArtistRecord`, and update column whitelists.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run worker/db.test.ts`
Expected: PASS

---

### Task 2: Worker CRUD API Routes for Artists & Exhibition Endpoints

**Files:**
- Modify: `worker/routes/crud.ts`
- Test: `worker/routes/crud.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/exhibitions/:id/artists`: returns array of `Artist`
  - `POST /api/artists`: creates an artist (validates user ownership of exhibition)
  - `PUT /api/artists/:id`: updates an artist (validates ownership)
  - `DELETE /api/artists/:id`: deletes an artist (validates ownership)
  - `GET /api/exhibitions/:id` and `GET /api/exhibitions/slug/:slug`: returns hydrated `artists` array and `artist_profile` on each artwork.

- [ ] **Step 1: Write failing route tests in `worker/routes/crud.test.ts`**

```ts
it('allows curators to create, update, and fetch artists for their exhibitions', async () => {
  const postRes = await app.fetch(
    new Request('http://localhost/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        exhibition_id: userExId,
        name: 'Trần Văn Cẩn',
        life_dates: '1910 - 1994',
        quote: 'Life in colors',
      }),
    }),
    env
  );
  expect(postRes.status).toBe(201);
  const created = (await postRes.json()) as Artist;
  expect(created.name).toBe('Trần Văn Cẩn');

  const getRes = await app.fetch(
    new Request(`http://localhost/api/exhibitions/${userExId}/artists`),
    env
  );
  expect(getRes.status).toBe(200);
  const list = (await getRes.json()) as Artist[];
  expect(list.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run worker/routes/crud.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Artist CRUD routes and hydration in `worker/routes/crud.ts`**

Add route handlers for `/api/artists`, `/api/artists/:id`, and `/api/exhibitions/:id/artists`. In exhibition detail and slug handlers, query and attach `artists` and map `artwork.artist_id` to its artist profile.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run worker/routes/crud.test.ts`
Expected: PASS

---

### Task 3: Artist Profile Modal & FocusPanel Integration

**Files:**
- Create: `src/components/viewer/ArtistProfileModal.tsx`
- Modify: `src/components/viewer/FocusPanel.tsx`
- Modify: `src/components/viewer/ExhibitionViewer.tsx`
- Test: `src/components/viewer/artist-profile.test.tsx`

**Interfaces:**
- Consumes: `Artist`, `Artwork`, `proxyMediaUrl`
- Produces: `<ArtistProfileModal artist={artist} artworks={artworksByArtist} onClose={...} />`

- [ ] **Step 1: Write failing component tests in `src/components/viewer/artist-profile.test.tsx`**

```tsx
it('renders artist biography, quote, life dates and artworks list', () => {
  render(
    <ArtistProfileModal
      artist={{
        id: 'art-1',
        exhibition_id: 'ex-1',
        name: 'Trần Văn Cẩn',
        life_dates: '1910 – 1994',
        quote: 'Art is the poetry of sight',
        biography: 'Pioneer of modern Vietnamese art.',
        contact_info: 'Hanoi Arts Association',
        portrait_file_id: null,
        order_index: 0,
        created_at: 1000,
      }}
      artworks={[]}
      onClose={() => {}}
    />
  );
  expect(screen.getByText(/Trần Văn Cẩn/)).toBeInTheDocument();
  expect(screen.getByText(/Art is the poetry of sight/)).toBeInTheDocument();
  expect(screen.getByText(/Pioneer of modern Vietnamese art/)).toBeInTheDocument();
  // Monogram initials fallback
  expect(screen.getByText('TC')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/viewer/artist-profile.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `ArtistProfileModal.tsx` and integrate with `FocusPanel.tsx`**

Build the fullscreen modal with responsive two-column grid, serif typographic styling, monogram fallback, and quote block. In `FocusPanel.tsx`, render the secondary "Tìm hiểu về tác giả" button whenever `artwork.artist_profile` or artist name is available.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/viewer/artist-profile.test.tsx`
Expected: PASS

---

### Task 4: Exhibition Intro Video Loader with Preload Handshake

**Files:**
- Create: `src/components/viewer/IntroVideoLoader.tsx`
- Modify: `src/components/viewer/ExhibitionViewer.tsx`
- Test: `src/components/viewer/intro-video.test.tsx`

**Interfaces:**
- Consumes: `intro_video_file_id`, `proxyMediaUrl`, `isSceneReady`
- Produces: `<IntroVideoLoader fileId={...} isSceneReady={...} onFinished={...} />`

- [ ] **Step 1: Write failing component tests in `src/components/viewer/intro-video.test.tsx`**

```tsx
it('shows skip button when isSceneReady becomes true while video plays', () => {
  const { rerender } = render(
    <IntroVideoLoader
      fileId="drive_intro_vid"
      isSceneReady={false}
      onFinished={() => {}}
    />
  );
  expect(screen.queryByRole('button', { name: /Vào triển lãm|Skip/i })).not.toBeInTheDocument();

  rerender(
    <IntroVideoLoader
      fileId="drive_intro_vid"
      isSceneReady={true}
      onFinished={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: /Vào triển lãm|Skip/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/viewer/intro-video.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `IntroVideoLoader.tsx` and integrate with `ExhibitionViewer.tsx`**

Implement video player with auto-play handling (`try play unmuted -> catch -> mute + prompt`), cross-fade dismissal, and 3D readiness listener in `ExhibitionViewer.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/viewer/intro-video.test.tsx`
Expected: PASS

---

### Task 5: Collapsible Glassmorphic Hotspot Panel & Museum Spotlight Backdrop

**Files:**
- Modify: `src/components/viewer/InspectLightbox.tsx`
- Test: `src/components/viewer/viewer.test.tsx`

**Interfaces:**
- Produces:
  - Mode toggle between Full Drawer and Floating Compact Card (`cardMode: 'drawer' | 'compact'`)
  - Glassmorphic backdrop styling on hotspot panel
  - Radial museum spotlight gradient backdrop on inspect stage (`radial-gradient(circle at center, #1c2336 0%, #0d121f 50%, #05070c 100%)`)
  - Multi-stage soft drop shadow on framed slab.

- [ ] **Step 1: Add unit tests for compact card mode toggle and backdrop in `src/components/viewer/viewer.test.tsx`**

- [ ] **Step 2: Run tests to verify failure/coverage**

Run: `pnpm exec vitest run src/components/viewer/viewer.test.tsx`

- [ ] **Step 3: Implement glassmorphism, mode toggle, and radial spotlight in `InspectLightbox.tsx`**

Add `cardMode` state in `InspectLightbox.tsx`, render floating compact card when in compact mode, and apply the radial gradient & shadow styles to `.inspect-lightbox__viewport` and `.inspect-lightbox__slab`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/viewer/viewer.test.tsx`
Expected: PASS

---

### Task 6: Studio Curation & Artist Manager UI

**Files:**
- Create: `src/components/studio/ArtistManager.tsx`
- Modify: `src/components/studio/StudioApp.tsx`
- Modify: `src/components/studio/ArtworkManager.tsx` (or embedded artwork list)
- Test: `src/lib/studio/studio.test.ts`

**Interfaces:**
- Produces:
  - Curation Type selector (`Solo Exhibition` vs `Group / Multi-Artist`) in exhibition editor
  - `intro_video_file_id` input in exhibition editor
  - `<ArtistManager exhibitionId={...} artists={...} onArtistsChanged={...} />`
  - Artist selection dropdown in `ArtworkForm.tsx`
  - Artworks list grouped by artist headers when `curation_type === 'group'`.

- [ ] **Step 1: Write failing tests in `src/lib/studio/studio.test.ts` for artist grouping and patch helpers**

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/studio/studio.test.ts`

- [ ] **Step 3: Implement `ArtistManager.tsx` and integrate with `StudioApp.tsx`**

Add artist creation/edit modal, exhibition curation type toggle, intro video URL input, and group-by-artist rendering in studio.

- [ ] **Step 4: Run full project verification**

Run: `pnpm build && pnpm test`
Expected: All TypeScript compiles with 0 errors and all tests pass.
