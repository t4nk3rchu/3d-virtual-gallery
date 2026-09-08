# Redesign Walkthrough — `redesign/foundation`

**Branch:** `redesign/foundation`  
**Final commit:** `f99549f`  
**Tests:** 242/242 ✅  
**Build:** clean, 3.27s ✅

---

## What Was Done

All four Plans from `HANDOFF.md` are complete and merged into `redesign/foundation`.

### Plan 01 — Foundation Token Rebase

| Commit | What |
|---|---|
| `40b0b13` | Purged 52 indigo occurrences from `App.css` → `--reda-*` |
| `170bf8a` | Purged 97 slate/near-white neutrals from `App.css` → tokens |
| `6066a79` | Aliased `index.css :root` onto `--reda-*` (removed all raw hex) |
| `1e2c392` | Swept remaining 33 off-palette hex values |
| `49ae873` | Visual smoke verification (Chrome DevTools confirmed palette) |

Guard file `src/lib/app-css-palette.test.ts` added: 5 tests — no indigo, no slate neutrals, `:root` pure tokens, no bare hex, 80+ `--reda-*` references (actual: 157+).

---

### Plan 02 — Viewer Restyle (dark sơn-mài)

`subagent-Viewer-Restyle-Engineer-self-5396ed65` → merged `41a0332`

- `reda-viewer.css` fully converted: 2340 lines, dark register throughout
- Intro/loading → Tranh Việt palette
- Roam HUD + joystick restyled
- Focus panel + audio guide restyled
- Inspect lightbox + pins + sidebar: dark veil `rgba(14,13,10,0.38)` + `blur(1px)`; transparent header in expanded state
- Artist modal restyled
- Fallback/settings/error views restyled
- 3D-Tilt button gated to mobile-only
- All 14 no-emoji tests green

---

### Plan 03 — Studio Restyle (light giấy-điệp)

`subagent-Studio-Restyle-Engineer-self-850c0525` → merged `f99549f`

- Walkthrough mode (`'walk'`) removed from `CmsMode` union and all callsites
- Workbench shell converted to light register (`--reda-parch`, `--reda-eggshell`)
- Artworks pane, gizmo HUD, status bar restyled
- Artwork inspector form restyled
- 2D hotspot editor + transition preview restyled
- Artists pane, inspector, viewer preview restyled (incl. `ArtistViewerPreview.tsx`)
- Setup sheet restyled; redundant setup sub-nav dropped
- New-exhibition form restyled (light register, `.studio-new-exhibition.reda-parch`)

**Merge conflict resolved:** `tokens.css` — both `--reda-ink-muted` (auth) and `--reda-muted-ink` (studio) kept as aliases at `#6B5D42`.

---

### Plan 04 — Auth + Dashboard + Account

`subagent-Auth-Dashboard-Engineer-self-e675f751` → merged `c43be37`

- Auth pages: light-default theme + dark toggle (sun/moon icons in `Icon.tsx`), theme persisted to `localStorage('reda-theme')`
- Dashboard: full restyle + empty-state branch + inline 2-step delete confirm (no `window.confirm`)
- Account page: new `Account.tsx` + `Account.test.tsx` (148 lines)
- Worker: `POST /api/auth/change-password` with TDD (`worker/auth.test.ts`)

---

## Merge Conflicts Resolved

| File | Conflict | Resolution |
|---|---|---|
| `src/styles/tokens.css` | Auth added `--reda-ink-muted`, Studio added `--reda-muted-ink` (same `#6B5D42`) | Kept both as aliases |
| `src/components/studio/StudioApp.test.tsx` | Auth added theme-toggle + account-nav tests; Studio added new-exhibition test | Kept all 5 tests; merged `fireEvent` + `userEvent` imports |

---

## Verification

```
Test Files  50 passed (50)
      Tests  242 passed (242)
   Duration  18.55s

✓ built in 3.27s
```

No regressions. The large Babylon.js chunk warning is pre-existing, not caused by these changes.
