# REDA Redesign 03 — Studio Restyle + Light Conversion + Walkthrough Removal

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Read `00-roadmap.md` (shared context + Global Constraints) and finish `01-foundation.md` first. Steps use `- [ ]`.

**Goal:** Restyle the curator Studio to match `mockup/studio/**`, converting the studio chrome from the current **dark** register to the **light giấy-điệp** register, and **remove the Walkthrough mode**, preserving every other studio feature.

**Architecture:** `/studio` → `StudioApp.tsx` (shell/auth/dashboard/new-exhibition) → `workbench/Workbench.tsx` (editor). Styling: `src/styles/reda-studio.css` (1578 lines, token-based) + `reda-workbench.css` (89) + `reda-ui.css` (shared primitives) + component inline styles + App.css leftovers (Plan 01). Studio roots currently apply `className="… reda-dark"`; this plan moves the studio editor to the light register (embedded viewer-*preview* surfaces stay dark). No logic/DOM change except the Walkthrough removal and the Setup sub-nav simplification.

**Tech Stack:** React 19 + TS, Babylon.js (studio authoring camera), plain global CSS, `--reda-*` tokens, Vitest (dom), pnpm.

## Global Constraints

Roadmap constraints apply. Studio-specific:
- **Light giấy-điệp register** for studio chrome: grounds `--reda-parch`/`--reda-parch-2`/`--reda-eggshell`/`--reda-field`; text `--reda-ink`; secondary/caption text a **≥4.5:1** muted (add `--reda-muted-ink: #6B5D42` to `tokens.css` if a light-ground muted is missing — keep `design-tokens.test.ts` green). Borders `--reda-parch-border`.
- **Embedded viewer-preview surfaces stay dark** sơn-mài: `ArtistViewerPreview` (it simulates the visitor artist modal), dimmed-room backdrops behind the setup/hotspot modals, the featured-artist card preview.
- **son** = save/publish/delete-commit; **gold** = single accent (never fill — neutralize any gold-filled toggle to `--reda-parch`/`--reda-diep` selected state); **chàm** = detail/inspect + selected-tool.
- Keep `<Icon>` (no emoji). Keep English copy. Keep the shared `ui/` primitives.
- Every studio test stays green; update a test in the same task when a class/text it asserts changes.

## Feature-preservation checklist (MUST all still work)

- **Top bar (`WorkbenchTopBar`):** brand→dashboard, breadcrumb, mode pill (**after removal: Artworks + Waypoints only**), "Saved" indicator, Preview link, Publish/Unpublish toggle, avatar→dashboard. (No manual Save button — saving is auto.)
- **Tool rail (`ToolRail`):** Curate / Rooms / Artists / Setup.
- **Artworks pane (`ArtworksPane`):** header+add, In-Room/Storage segmented tabs w/ counts, artist filter select, list rows (index/thumb/title/medium), three empty states.
- **Rooms pane / Setup pane** (inline in `Workbench`): room list (PUT room_id), setup mini-nav.
- **Gizmo (`GizmoPlacement`):** ArcRotate roam (WASD/orbit/pan/select/Esc), gizmo Move/Rotate/Scale toggle (Waypoints = Move/Rotate only), Lock-Ratio/Free-Scale, Frame Artwork, Unfocus, Set-at-Camera (spawn), coordinate HUD, Controls & Keys → `StudioSettingsSidebar`, per-mode `badge-mode`.
- **Inspector (`Inspector`+`ArtworkForm`):** room-placement toggle, live frame preview, hotspots quick-action banner (→ `HotspotEditor`), artwork-type selector (2D/Video/3D-disabled), media inputs + `DriveFilePicker`, audio guide field, Frame & Placard settings, metadata + artist-profile link, sticky footer Delete/Cancel/Save.
- **Hotspot editor (`HotspotEditor`, 2D):** transition-animation select (+auto-save +`HotspotTransitionPreview`), click-to-drop pins, new/edit pin forms (title/text/Option A segment/Option B dedicated file), delete, done.
- **Artists:** `ArtistsPane` (list+add), `ArtistInspector` (portrait picker, name/dates/quote/bio/contact, Assigned Works→jump-to-curate, delete/cancel/save), `ArtistViewerPreview` (PC/Mobile-Landscape device toggle, simulated dark viewer modal, empty state).
- **Setup (`SetupSheet`):** title/curator/room, ambient audio, starting vantage point (+reset), format SegmentedControl, manage-artists shortcut, curatorial statement, intro video + `IntroTransitionPreview`, save.
- **New Exhibition (`NewExhibitionForm`):** title/curator, library-room vs custom-GLB dual mode + `DriveFilePicker`, description, create/cancel.
- **Status bar (`StatusBar`):** room · N works · mode · Auto-saved.

## Mockup ↔ component map

| Mockup | Component(s) |
|---|---|
| `studio/view-03-workbench.html` | `Workbench.tsx`, `WorkbenchTopBar.tsx`, `ToolRail.tsx`, `ArtworksPane.tsx`, `GizmoPlacement.tsx`, `Inspector.tsx`+`ArtworkForm.tsx`, `StatusBar.tsx` |
| `studio/view-03b-hotspot-2d.html` | `HotspotEditor.tsx`, `HotspotTransitionPreview.tsx` |
| `studio/view-03c-hotspot-3d.html` | **DEFERRED — do not build** (no 3D authoring yet) |
| `studio/view-04-artists.html` | `ArtistsPane.tsx`, `ArtistInspector.tsx`, `ArtistViewerPreview.tsx` |
| `studio/view-05-setup.html` | `SetupSheet.tsx`, `IntroTransitionPreview` (in SetupSheet), Setup pane in `Workbench.tsx` |
| `studio/view-06-new-exhibition.html` | `NewExhibitionForm` (in `StudioApp.tsx:453-712`) |
| `studio/view-07-waypoints.html` | `Workbench.tsx` (waypoints mode) + `GizmoPlacement.tsx` |
| `elements/element-library.html` | shared `ui/` primitives + artist/artwork card markup |

---

### Task 1: Remove the Walkthrough mode

**Files:**
- Modify: `src/components/studio/workbench/WorkbenchTopBar.tsx` (MODE_ITEMS `:5-9`), `workbench/Workbench.tsx` (mode type `:29`, badge-mode `:246-252`, pass-through `:260`), `studio/GizmoPlacement.tsx` (walk branches `:327-328`, `:443-445`, `:875-878`, `:1016-1019`), `workbench/StatusBar.tsx` if it special-cases walk
- Test: `workbench/Workbench.test.tsx` (and any test asserting a 'walk' mode)

**Preserve:** Artworks + Waypoints modes fully; every non-walk `GizmoPlacement` branch.

- [ ] **Step 1:** Remove the `'walk'` entry from `WorkbenchTopBar.tsx` `MODE_ITEMS` so the mode pill shows only **Artworks** and **Waypoints**.
- [ ] **Step 2:** Narrow the `mode` union in `Workbench.tsx:29` to `'artworks' | 'waypoints'`; remove the walkthrough `badge-mode` case (`:249-252`).
- [ ] **Step 3:** In `GizmoPlacement.tsx`, delete the walk-specific branches: the walk deselect (`:327-328`), the walk picking-disable (`:443-445`), the walkthrough toolbar label (`:875-878`), and the walkthrough HUD copy (`:1016-1019`). Leave all Artworks/Waypoints logic intact.
- [ ] **Step 4:** Run: `pnpm test -- src/components/studio/workbench/Workbench.test.tsx` → PASS. Update any assertion that referenced 'walk'/Walkthrough (remove those cases).
- [ ] **Step 5:** `pnpm build` → clean (the narrowed union must not leave dangling `case 'walk'`).
- [ ] **Step 6:** `git add -A && git commit -m "feat(studio): remove Walkthrough mode"`

---

### Task 2: Convert the workbench shell to the light register

**Files:**
- Modify: `src/styles/reda-studio.css` + `reda-workbench.css` (shell/topbar/rail/pane/status sections), `workbench/Workbench.tsx` (root className), `WorkbenchTopBar.tsx`, `ToolRail.tsx`, `StatusBar.tsx`
- Test: `workbench/Workbench.test.tsx`, `src/lib/reda-workbench-css.test.ts`, `reda-studio-css.test.ts`

**Preserve:** the entire top-bar/rail/pane/status feature set; the resizable inspector; grid layout.

- [ ] **Step 1:** Target `mockup/studio/view-03-workbench.html`. Change the workbench root register from dark to **light**: replace the dark `reda-dark` ground on the Workbench shell with the light giấy-điệp ground (`--reda-parch` app bg, `--reda-parch-2`/`--reda-field` panels, `--reda-ink` text, `--reda-parch-border` borders). Keep the 3D viewport area dark (it renders the Babylon scene). Do this in `reda-studio.css`/`reda-workbench.css`; if the shell reads a `reda-dark` class, switch the Workbench root to a light register class (or drop `reda-dark` there) — **do not** touch the viewer's `reda-dark`.
- [ ] **Step 2 (cross-file consistency, matches the mockups' corrections):** unify chrome to the mockup values — mode toggle selected state = `--reda-parch`/diep (no gold/son fill), "Saved" indicator = mono small + green dot, wordmark 22px, top-bar Publish = `--reda-son`. Tool-rail active = `rgba(201,163,91,.18)` gold tint + `--reda-gold-deep` icon (add `aria-current`).
- [ ] **Step 3:** `pnpm test -- src/components/studio/workbench/Workbench.test.tsx src/lib/reda-workbench-css.test.ts src/lib/reda-studio-css.test.ts` → PASS. Update the CSS-guard tests to the new light-register expectations (never re-add banned indigo/slate).
- [ ] **Step 4:** `pnpm dev`, open `/studio` → an exhibition editor; screenshot; confirm the shell is light and matches `view-03-workbench`.
- [ ] **Step 5:** `git add -A && git commit -m "style(studio): convert workbench shell to light register"`

---

### Task 3: Artworks pane + Gizmo HUD + Status bar

**Files:**
- Modify: `reda-studio.css`, `ArtworksPane.tsx`, `GizmoPlacement.tsx` (HUD/toolbar classes + inline), `StatusBar.tsx`
- Test: `workbench/ArtworksPane.test.tsx` (if present under panes test), `workbench/Workbench.test.tsx`

**Preserve:** In-Room/Storage tabs + counts, artist filter, list rows, empty states; every gizmo control (Move/Rotate/Scale, Lock-Ratio, Frame, Unfocus, Set-at-Camera, coordinate HUD, Controls&Keys); status bar readout.

- [ ] **Step 1:** Target `view-03-workbench` (pane) + `view-07-waypoints` (gizmo HUD). Pane = light panel; segmented tabs selected = `--reda-son` (In-Room/Storage is a real state filter — acceptable son use, matching the mockup) OR neutral per the mockup's approved treatment — follow `view-03-workbench`'s pane exactly. List rows = light card rows, chàm/gold accents.
- [ ] **Step 2 (gizmo HUD):** the floating HUD/toolbar sits over the dark 3D viewport → keep it a dark translucent chip (`--reda-glass`, gold hairline) with `--reda-cream-hi` labels and `--reda-cham-hi` for the active tool (matches `view-07-waypoints`'s bottom toolbar). Coordinate HUD = mono readout.
- [ ] **Step 3:** `pnpm test -- src/components/studio/workbench/` → PASS.
- [ ] **Step 4:** `pnpm dev`, screenshot Artworks pane + a selected artwork with the gizmo + Waypoints mode; compare to `view-03-workbench` / `view-07-waypoints`.
- [ ] **Step 5:** `git add -A && git commit -m "style(studio): restyle artworks pane, gizmo HUD, status bar"`

---

### Task 4: Inspector (ArtworkForm)

**Files:**
- Modify: `reda-studio.css` (inspector/form sections), `Inspector.tsx`, `ArtworkForm.tsx` (inline styles flagged: `:269-270` etc.)
- Test: `studio/ArtworkForm.test.tsx`, `workbench/Inspector.test.tsx`

**Preserve:** room-placement toggle, live frame preview, hotspots banner→editor, type selector (3D disabled "Under Construction"), media inputs+`DriveFilePicker`, audio guide field, Frame & Placard settings, metadata + artist-profile link, sticky footer.

- [ ] **Step 1:** Target `view-03-workbench` inspector. Light form: `--reda-field` inputs, `--reda-parch-border`, `--reda-ink` text, mono `--reda-label` field labels. Footer **Xoá(=Delete) pushed left; Cancel+Save grouped right** (matches the approved mockup footer order), `border-radius` pill, Save/Add = `--reda-son`, Delete = son-tinted danger.
- [ ] **Step 2:** Confirm `ArtworkForm.tsx` inline styles use light tokens (`var(--reda-parch-card)`, `var(--reda-parch-border)`) — they already do per exploration; verify none reference dark grounds now that the shell is light.
- [ ] **Step 3:** `pnpm test -- src/components/studio/ArtworkForm.test.tsx src/components/studio/workbench/Inspector.test.tsx` → PASS.
- [ ] **Step 4:** `pnpm dev`, open an artwork inspector; screenshot; verify all field groups + footer order.
- [ ] **Step 5:** `git add -A && git commit -m "style(studio): restyle artwork inspector form"`

---

### Task 5: Hotspot editor (2D) + transition preview

**Files:**
- Modify: `reda-studio.css` (hotspot-editor section — also App.css:777 Plan 1 done), `studio/HotspotEditor.tsx`, `studio/HotspotTransitionPreview.tsx`
- Test: any HotspotEditor test (grep `HotspotEditor.test`)

**Preserve:** modal shell, transition select + auto-save + live preview, click-to-drop pins, new/edit forms (Option A segment / Option B dedicated file + picker), create/update/delete, done.

- [ ] **Step 1:** Target `view-03b-hotspot-2d.html`. Light điệp modal over a dimmed dark room backdrop; the pin **stage** stays dark (it shows the artwork); pins = `--reda-cham` (not the old raw blue); the transition preview widget = the shared dark minimap treatment. Ensure the two time inputs shrink (`min-width:0`) so the edit panel never overflows the modal (the mockup fix).
- [ ] **Step 2:** `pnpm test -- <HotspotEditor test file>` → PASS.
- [ ] **Step 3:** `pnpm dev`, open the hotspot editor from the inspector banner; screenshot; compare to `view-03b`.
- [ ] **Step 4:** `git add -A && git commit -m "style(studio): restyle 2D hotspot editor + transition preview"`

---

### Task 6: Artists — pane, inspector, viewer-preview

**Files:**
- Modify: `reda-studio.css`, `ArtistsPane.tsx`, `ArtistInspector.tsx`, `ArtistViewerPreview.tsx`
- Test: `workbench/ArtistInspector.test.tsx`, any ArtistsPane/preview test

**Preserve:** list+add; portrait picker, name/dates/quote/bio/contact, Assigned Works→jump-to-curate, delete/cancel/save; the PC/Mobile-Landscape device toggle + simulated viewer modal + empty state.

- [ ] **Step 1:** Target `view-04-artists.html`. Studio chrome (pane + inspector) = light; the **`ArtistViewerPreview` center stage stays dark** (it previews the dark visitor modal — the featured card, portrait+years left, name→gold-hairline quote→bio right, works strip). Keep the device toggle (PC / Mobile-Landscape). **No-Kicker:** drop the "Featured Artist" eyebrow in the preview (name carries it) — mirror the same change made in the viewer's `ArtistDetailModal` (Plan 02 Task 5) so the two duplicated dossiers stay in sync.
- [ ] **Step 2:** `pnpm test -- src/components/studio/workbench/ArtistInspector.test.tsx` (+ any preview test) → PASS.
- [ ] **Step 3:** `pnpm dev`, Artists mode: select an artist; screenshot pane + inspector + preview (both device toggle states); compare to `view-04-artists` + `mockup/elements` featured card (desktop + mobile-landscape).
- [ ] **Step 4:** `git add -A && git commit -m "style(studio): restyle artists pane, inspector, viewer preview"`

---

### Task 7: Setup sheet (+ intro transition preview) + Setup sub-nav

**Files:**
- Modify: `reda-studio.css`, `SetupSheet.tsx`, `Workbench.tsx` (Setup pane inline nav `:133-158`)
- Test: any SetupSheet test

**Preserve:** all setup fields (title/curator/room/ambient audio/vantage point+reset/format/manage-artists/curatorial statement/intro video), the intro transition select + live `IntroTransitionPreview`, save.

- [ ] **Step 1:** Target `view-05-setup.html`. Light settings form over a dimmed room; **format SegmentedControl selected state = neutral `--reda-parch`/diep (NOT gold fill)** per the One-Gold correction; the intro-transition preview reuses the shared transition-preview treatment. The **Setup mini-nav pane** (`Workbench.tsx:133-158`, "Identity & Space / Artists / Curate Room") was **removed in the approved mockup** (its items just route to existing tools) — remove that redundant sub-nav so Setup shows the form directly, matching `view-05-setup`. (This is a small nav simplification, not a feature loss — the same destinations remain on the tool rail.)
- [ ] **Step 2:** `pnpm test -- <SetupSheet test>` + `pnpm test -- src/components/studio/workbench/Workbench.test.tsx` → PASS (update if the sub-nav removal breaks an assertion).
- [ ] **Step 3:** `pnpm dev`, Setup tool; screenshot; compare to `view-05-setup` (no sub-nav, neutral format toggle, transition preview).
- [ ] **Step 4:** `git add -A && git commit -m "style(studio): restyle setup sheet; drop redundant setup sub-nav"`

---

### Task 8: New Exhibition form

**Files:**
- Modify: `reda-studio.css` / App.css (Login/dashboard section shares) , `StudioApp.tsx` `NewExhibitionForm` (`:453-712`)
- Test: `StudioApp.test.tsx`

**Preserve:** title/curator, library-room vs custom-GLB dual mode + `DriveFilePicker`, description, create/cancel, slug auto-gen.

- [ ] **Step 1:** Target `view-06-new-exhibition.html`. **Light background** (this stands alone over a light ground, not dark). Space-type toggle selected = `--reda-son` for the primary "custom" choice per the mockup, or neutral — follow `view-06` exactly (the mockup neutralized it). Create = `--reda-son`.
- [ ] **Step 2:** `pnpm test -- src/components/studio/StudioApp.test.tsx` → PASS.
- [ ] **Step 3:** `pnpm dev`, "New exhibition"; screenshot; compare to `view-06`.
- [ ] **Step 4:** `git add -A && git commit -m "style(studio): restyle new-exhibition form (light)"`

---

### Task 9: Studio full-suite gate + visual pass

- [ ] **Step 1:** `pnpm test` → PASS (dom+node); reconcile `reda-studio-css.test.ts`/`reda-workbench-css.test.ts` to the new light-register token expectations.
- [ ] **Step 2:** `pnpm build` → clean (verify the `mode` union narrowing left no `'walk'` references).
- [ ] **Step 3:** `pnpm dev`, exercise the whole studio: dashboard→editor→Curate(gizmo)→Inspector→Hotspot editor→Artists→Setup→Waypoints→Preview/Publish; confirm each matches its mockup, walk mode is gone, and every checklist feature works.
- [ ] **Step 4:** `git commit --allow-empty -m "chore(studio): restyle + walkthrough removal verified"`

## Self-Review (completed)

- **Coverage:** every studio mockup (03, 03b, 04, 05, 06, 07) maps to a task; 03c explicitly deferred; walkthrough removal is Task 1; light conversion is Task 2; the duplicated artist dossier is kept in sync (Task 6). ✓
- **Placeholders:** each task names exact files + line refs, the specific rule deltas (neutral toggles, son primaries, footer order, sub-nav removal, chàm pins), the mockup as spec, and a test+screenshot gate. ✓
- **Consistency:** `mode` union, MODE_ITEMS, GizmoPlacement branch lines, and the ArtistViewerPreview↔ArtistDetailModal sync all reference the exploration's exact locations. ✓
