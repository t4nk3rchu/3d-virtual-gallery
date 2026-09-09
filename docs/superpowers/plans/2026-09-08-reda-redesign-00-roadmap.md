# REDA "Tranh Việt" Redesign — Implementation Roadmap (index)

> **For agentic workers:** This is the index for a set of sequenced plans. Execute them in order; each ships working, testable software on its own. Do NOT start a surface plan before the Foundation plan (01) is merged.

**Goal:** Bring the live React app (`src/`) to the approved "Tranh Việt" mockups in `mockup/`, preserving every existing feature. This is a **restyle** (visual layer + a few scoped net-new surfaces), not a rewrite of behavior.

**Why a roadmap, not one plan:** the work spans a shared CSS foundation plus four independent surfaces and some net-new features. Per the writing-plans scope check, it's split so each plan produces working software and can be reviewed independently.

---

## Reality of the codebase (from architecture exploration)

- **Router:** hand-rolled in `src/App.tsx` (`getRoute()`), two routes only: `/e/:slug` → `ExhibitionViewer`, `/studio` → `StudioApp`. Auth, Dashboard, New-Exhibition are **view-states inside `StudioApp.tsx`** (712 lines), not routes.
- **Styling:** 100% global CSS, loaded once in `src/main.tsx:3-11` in this order: `index.css`, `App.css`, `styles/fonts`, `styles/tokens.css`, `styles/base.css`, `styles/reda-ui.css`, `styles/reda-studio.css`, `styles/reda-workbench.css`, `styles/reda-viewer.css`.
- **The token layer is already Tranh Việt.** `src/styles/tokens.css` defines the full `--reda-*` palette (char `#0E0D0A`, parch `#EDE4CC`, gold `#C9A35B`, son `#B23A22`, cham `#2E4A5A`, type tokens). `reda-viewer.css` (2841 lines) and `reda-workbench.css` **consume tokens, zero hardcoded hex**; `reda-studio.css` is token-based with Tranh-Việt tones.
- **The gap is `src/App.css` (3256 lines):** ~189 hardcoded hex — **~40 old-indigo** (`#6366f1/#818cf8/#a5b4fc/#4f46e5/#c7d2fe`) + **~120 slate/zinc** (`#fff`, `#94a3b8`, `#cbd5e1`, …). It has only 8 `var(--reda-*)` references, and its high-specificity selectors **override the token layer** (e.g. `App.css:1636` `.inspect-lightbox__title-info .eyebrow{color:#818cf8}` beats `reda-viewer.css:43` `.eyebrow{color:var(--reda-gold)}`). `src/index.css` carries a **parallel** token vocabulary (`--text/--bg/--accent`) that must be reconciled.
- **Shared UI primitives** exist: `src/components/ui/` (`Button`, `Icon`, `SegmentedControl`, `Tabs`, `Toggle`, `TextField`, `TextArea`, `SelectField`, `Plate`, …). Every component renders icons via `<Icon name=…>`; **`src/components/viewer/no-emoji.test.ts` forbids emoji.**
- **Tests:** Vitest, two projects (`dom` jsdom for `src/components/**`, `node` for `src/lib/**` + `worker/**`). **CSS-guard tests** assert stylesheet contents: `src/lib/reda-studio-css.test.ts`, `reda-viewer-css.test.ts`, `reda-workbench-css.test.ts`, `design-tokens.test.ts` — restyling breaks these; each plan updates its own. There is **no guard on `App.css`** (why the old palette persists).
- **Commands (pnpm):** `pnpm dev` (Vite :5173, proxies `/api`→`:8787`), `pnpm test` (`vitest run`), `pnpm build` (`tsc -b && vite build` = the typecheck), `pnpm worker:dev` (wrangler). No lint script (an `.oxlintrc.json` exists, unwired).

## Locked decisions (user, 2026-09-08)

- **Build (net-new):** Account page + password-change endpoint, Dashboard empty-state, Auth light/dark theme toggle.
- **Defer / drop:** the **3D hotspot editor** (`mockup/studio/view-03c-hotspot-3d.html`) — the app has no 3D-model support yet; hotspots are authored 2D-only. Revisit when 3D-model support lands (`docs/.../2026-09-04-3d-model-support.md`).
- **Remove:** the **Walkthrough** studio mode (`'walk'`) — mockups dropped it; it's a live-but-thin mode in code (disables editing + relabels HUD in `GizmoPlacement`; does not swap to a gravity camera). Removal is a scoped feature deletion.
- **Copy:** keep existing **English** UI strings. The mockups' Vietnamese copy is a *visual* reference only; Vietnamese/bilingual EN-VI is a **separate later phase** (PRODUCT.md sequences it after the visual redesign).

## Shared Global Constraints (apply to EVERY plan below)

- **Restyle, not rebuild.** Preserve all behavior, DOM structure, component props, routes, and API endpoints. The only functional changes anywhere are the three scoped net-new surfaces and the Walkthrough removal.
- **Tokens only.** All colors come from `--reda-*` (defined in `src/styles/tokens.css`). No new hardcoded hex anywhere except inside `tokens.css`. Role mapping when replacing legacy colors: **son** `--reda-son` = primary/commit/destructive action; **gold** `--reda-gold` = single hairline/accent (never an area fill — One Gold Rule); **chàm** `--reda-cham(-hi)` = inspect/detail context + selected-tool; text = `--reda-cream(-hi)` / `--reda-muted` on dark, `--reda-ink` / a ≥4.5:1 muted on light.
- **Icons, not emoji.** Keep the `<Icon>` system; map any mockup emoji glyph to an `Icon name`. `no-emoji.test.ts` must stay green.
- **Registers:** Viewer = dark sơn-mài; Studio/Dashboard/Account = light giấy-điệp (light-first; a dark theme is out of scope now); Auth = light default + a working dark toggle.
- **Named rules:** One Gold, Meaningful Red, No-Kicker (no mono/uppercase eyebrow above a heading — recolor/relabel existing eyebrows), Flat-Material (no faked texture), Fixed-Pin (hotspot pins constant screen size).
- **Verification per task:** `pnpm test` stays green (update the relevant CSS-guard test in the same task that changes the CSS it guards); `pnpm build` typechecks clean; for visual tasks, `pnpm dev` + screenshot the surface at desktop **and** mobile (iPhone SE 667×375) and compare to the matching mockup in `mockup/`.
- **TDD + frequent commits, pnpm.** Commit at every green step.

## Plan sequence

| # | Plan file | Scope | Ships |
|---|---|---|---|
| **01** | `2026-09-08-reda-redesign-01-foundation.md` | Rebase `App.css` + `index.css` onto the token layer; kill the specificity overrides; add an `App.css` palette guard test. **Zero visual regressions beyond correct color.** | The token layer becomes authoritative app-wide; the Inspect eyebrow (and every other override) now renders Tranh Việt. |
| **02** | `2026-09-08-reda-redesign-02-viewer.md` | Viewer restyle (dark register), PC + mobile SE1: intro/loading (`IntroVideoLoader`, `LoadingCurtain`), roam HUD + `VirtualJoystick` + hover tooltip, `FocusPanel` + `AudioGuidePlayer`, `InspectLightbox` (+ `InspectDesktopSidebar`, `HotspotOverlay`, mobile header title-swap/see-more/blur — already coded), `ArtistDetailModal`, `FallbackCatalog`, `SettingsModal`, `ViewerErrorView`. Align `reda-viewer.css` + component inline styles to `mockup/viewer/**`. | Full visitor experience matches the viewer mockups, all features intact. |
| **03** | `2026-09-08-reda-redesign-03-studio.md` | Studio restyle + **dark→light conversion** + **Walkthrough removal**: `Workbench`, `WorkbenchTopBar`, `ToolRail`, `ArtworksPane`, `ArtistsPane`, `Inspector`/`ArtworkForm`, `HotspotEditor` (2D) + `HotspotTransitionPreview`, `ArtistInspector` + `ArtistViewerPreview` (+ the duplicated artist dossier), `SetupSheet` + `IntroTransitionPreview`, `NewExhibitionForm`, `GizmoPlacement` HUD, `StatusBar`. Match `mockup/studio/**` (light). | Curator workbench matches the studio mockups; walk mode gone. |
| **04** | `2026-09-08-reda-redesign-04-auth-dashboard-account.md` | `StudioApp` Login/Register + **light-default theme + dark toggle**; Dashboard (son primaries, **empty-state**, restyle delete-confirm); **new Account page** (`CmsView` route + view + a `POST /api/auth/change-password` worker endpoint). Match `mockup/auth/**`, `mockup/dashboard/**`. | Front door + dashboard + account match mockups; theme toggle + account + empty-state shipped. |

Each surface plan opens with the **feature-preservation checklist** for that surface (captured during exploration) and cites the exact mockup files + component files it touches.

## Deferred / explicitly out of scope

- **3D hotspot authoring editor** (`view-03c`) — until 3D-model support exists.
- **Vietnamese / bilingual copy** — separate i18n phase after the visual redesign.
- **Studio dark theme** — light-first now; a dark studio theme is a later toggle.
- **Real dashboard thumbnails** — the card preview stays a decorative SVG placeholder (unchanged behavior).
