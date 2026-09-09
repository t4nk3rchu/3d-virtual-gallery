# REDA "Tranh Việt" Redesign — Implementation Handoff

You're implementing an approved visual redesign of this app (BabylonJS 3D virtual gallery; React 19 + TS + Vite front end, Cloudflare Worker + D1 back end). The design targets are the **HTML mockups in `mockup/`**; the work is a **restyle that preserves all existing behavior**, plus a few explicitly-scoped net-new pieces.

**Start here, then follow the plans in `docs/superpowers/plans/`.**

## Read order

1. `docs/superpowers/plans/2026-09-08-reda-redesign-00-roadmap.md` — the map: codebase reality, locked decisions, shared **Global Constraints** (read these — they apply to every plan), and the plan sequence.
2. Then the numbered plans (below). Each is a self-contained, task-by-task checklist. Execute tasks in order; each ends with a runnable test/build/screenshot gate and a commit.

## Execution order (important)

- **Do `01-foundation` FIRST.** It rebases `App.css`/`index.css` onto the Tranh Việt token layer and removes the overrides that currently make the token layer lose. Everything else assumes it's done.
- After 01, **`02-viewer`, `03-studio`, `04-auth-dashboard-account` are independent** of each other — do them in any order (or in parallel sessions).

| Plan | File | What it does |
|---|---|---|
| 01 | `…-01-foundation.md` | Token rebase of `App.css` + `index.css`; App.css palette guard. |
| 02 | `…-02-viewer.md` | Viewer restyle (dark register), desktop + mobile SE1. |
| 03 | `…-03-studio.md` | Studio restyle + dark→light conversion + **remove Walkthrough mode**. |
| 04 | `…-04-auth-dashboard-account.md` | Auth theme toggle, dashboard empty-state, **new Account page + password endpoint**. |

## Ground rules (non-negotiable)

- **Restyle, not rebuild.** Preserve behavior, DOM structure, component props, routes, and API endpoints. The only functional changes anywhere are: the Walkthrough removal (03), the dashboard native-confirm → inline-confirm (04), the new Account page + `POST /api/auth/change-password` (04), the auth theme toggle (04), and the dashboard empty-state (04). Every plan opens with a **feature-preservation checklist** — nothing on it may break.
- **Colors come from tokens only.** Use the `--reda-*` custom properties defined in `src/styles/tokens.css` (already full Tranh Việt: char `#0E0D0A`, parch `#EDE4CC`, gold `#C9A35B`, son `#B23A22`, cham `#2E4A5A`). No new hardcoded hex anywhere except inside `tokens.css`. Role mapping: **son** = action/commit, **gold** = single accent (never an area fill), **chàm** = inspect/detail.
- **Icons, not emoji.** The app uses a shared `<Icon>` component and a `no-emoji.test.ts` guard. The mockups' emoji glyphs are placeholders — map each to an `Icon name`. Keep `no-emoji.test.ts` green.
- **Keep English copy.** The mockups are Vietnamese for visual reference only; the app ships English and bilingual EN/VI is a separate later phase. Do not translate UI strings in this work.
- **Registers:** Viewer = dark sơn-mài. Studio/Dashboard/Account = light giấy-điệp. Auth = light default + a dark toggle. (A dark studio theme is out of scope now.)

## Decisions already made (do NOT re-litigate)

- **Build:** Account page + password-change endpoint, Dashboard empty-state, Auth light/dark toggle. (All in plan 04.)
- **Do NOT build the 3D hotspot editor** (`mockup/studio/view-03c-hotspot-3d.html`) — the app has no 3D-model support yet. Deferred.
- **Remove** the Walkthrough studio mode (plan 03, Task 1).
- **Keep English copy** (above).

## How to run / verify

- Package manager: **pnpm**.
- Dev: `pnpm dev` (Vite on `:5173`, proxies `/api` → `:8787`). For the live API: `pnpm worker:dev` in a second shell.
- Tests: `pnpm test` (Vitest — `dom` jsdom project for `src/components/**`, `node` project for `src/lib/**` + `worker/**`). Run a single file: `pnpm test -- <path>`.
- Typecheck + build: `pnpm build` (`tsc -b && vite build`). There is no separate lint script.
- **Visual check:** load the surface with `pnpm dev`, screenshot at **desktop (~1440px)** and **mobile (iPhone SE 667×375)**, and compare to the matching file in `mockup/`.

## Gotchas

- **CSS-guard tests** (`src/lib/reda-*-css.test.ts`, `design-tokens.test.ts`, and the new `app-css-palette.test.ts` from plan 01) assert stylesheet *text*. When you restyle CSS they guard, update the guard in the **same task** — but never re-add banned legacy palette (indigo `#6366f1…`, slate `#0f172a/#1e293b/#94a3b8…`).
- **`file:line` references** in the plans come from a codebase exploration and may have drifted. Treat them as locators — confirm the symbol/selector in the current file before editing.
- **The token layer already exists and is correct.** `reda-{viewer,studio,workbench}.css` already consume tokens; the stale palette lives in `App.css` (plan 01) — don't rewrite the token layer, extend/correct it.
- **Two artist dossiers are duplicated** (`viewer/ArtistDetailModal.tsx` and studio `workbench/ArtistViewerPreview.tsx`) — restyle both to stay in sync (plans 02 Task 5 + 03 Task 6).
- **Mobile inspect** already implements the header title-swap + "See more/See less" + blur backdrop in `InspectLightbox.tsx` — preserve that behavior; restyle only.

## Definition of done (per plan)

All feature-checklist items still work · `pnpm test` green · `pnpm build` clean · every state matches its mockup at desktop and SE1 mobile · committed task-by-task.
