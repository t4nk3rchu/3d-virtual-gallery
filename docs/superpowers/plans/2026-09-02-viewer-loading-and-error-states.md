# REDA Gallery: Theatrical Curtain-Lift Loader & Archival Error States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Renaissance Codex theatrical loader overlay with transition animations driven by exhibition settings (`slide_up` / curtain lift by default, or `zoom_in`, `fade`, `blur_fade`, `iris_circle`, `flash_white`), automatic entrance reveal when no intro video is configured, skip intro button, and dignified archival error states (404, 403, and WebGL2 fallback).

**Architecture:** 
- The `LoadingCurtain` component manages the 3D asset pipeline loading lifecycle (0–100%) with dynamic curatorial stage labels, gold progress rule, and an exit reveal animation driven by the curator's transition setting in `exhibition.settings_json` (`getIntroAnimation(introTransition)`).
- When an intro video is configured, the `IntroVideoLoader` presents the video with the responsive skip button once the 3D scene finishes compiling, using the same configured transition on skip/end.
- The `ViewerErrorView` component presents branded 404 (Archive Folio Missing) and 403 (Private Curatorial Salon) pages with actionable navigation.
- The `StudioApp` initial session check is elevated to a discreet Studio Vault spinner.

**Tech Stack:** React, TypeScript, CSS (REDA Design System tokens), Babylon.js, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-reda-design-system-foundation.md`

## Global Constraints

- Respect the REDA Design System tokens: `--reda-wall-deepest` (`#0D0C0A`), `--reda-parch`, `--reda-gold`, `--reda-oxblood`, `Libre Bodoni` for display titles, `Montserrat` for tracked kickers/labels, `EB Garamond` for prose.
- Zero creamy buttons on dark grounds (all dark buttons use gold/oxblood/charcoal borders).
- Transitions use `getIntroAnimation(transitionStyle)` with `slide_up` (Curtain Lift) as the default.
- All test suites must pass with zero regressions.

---

### Task 1: Create `LoadingCurtain` Component with Dynamic Transition Reveal

**Files:**
- Create: `src/components/viewer/LoadingCurtain.tsx`
- Test: `src/components/viewer/LoadingCurtain.test.tsx`
- Modify: `src/styles/reda-viewer.css`

**Interfaces:**
- Produces: `LoadingCurtain({ title, curatorName, progress, isReady, transitionStyle?, onRevealed })`

- [ ] **Step 1: Write tests for `LoadingCurtain`**
  - Verify render of Reda emblem, exhibition title, curator name, and progress percentage.
  - Verify stage phrases based on progress (0-30%, 30-75%, 75-99%, 100%).
  - Verify CSS transition class applied based on `transitionStyle` (defaults to `slide_up`).
  - Verify `onRevealed()` called after transition duration timeout.

- [ ] **Step 2: Run test to confirm failure**
  - Run `pnpm vitest run src/components/viewer/LoadingCurtain.test.tsx`.

- [ ] **Step 3: Implement `LoadingCurtain.tsx` and CSS in `reda-viewer.css`**
  - Implement progressive stage labels:
    - 0–30%: *"Opening Curatorial Archive…"*
    - 30–75%: *"Streaming 3D Spatial Geometry…"*
    - 75–99%: *"Illuminating Gallery Spotlights & Frames…"*
    - 100%: *"Gallery Room Prepared"*.
  - Implement golden hairline progress bar.
  - Add transition animation hooks matching `getIntroAnimation`.

- [ ] **Step 4: Run tests to verify pass**
  - Run `pnpm vitest run src/components/viewer/LoadingCurtain.test.tsx`.

---

### Task 2: Create Branded `ViewerErrorView` Component for 404 and 403 States

**Files:**
- Create: `src/components/viewer/ViewerErrorView.tsx`
- Test: `src/components/viewer/ViewerErrorView.test.tsx`
- Modify: `src/styles/reda-viewer.css`

**Interfaces:**
- Produces: `ViewerErrorView({ type: 'not_found' | 'private' | 'network_error', message?, onRetry? })`

- [ ] **Step 1: Write tests for `ViewerErrorView`**
  - Verify 404 (Folio Not Found) displays title, archival explanation, and return buttons.
  - Verify 403 (Private Salon) displays lock badge, draft notice, and curator login CTA.

- [ ] **Step 2: Run test to confirm failure**
  - Run `pnpm vitest run src/components/viewer/ViewerErrorView.test.tsx`.

- [ ] **Step 3: Implement `ViewerErrorView.tsx` and styling**
  - Render atmospheric museum depth background with corner brackets and gold crest.
  - Add action buttons linking to `/` or `/login`.

- [ ] **Step 4: Run tests to verify pass**
  - Run `pnpm vitest run src/components/viewer/ViewerErrorView.test.tsx`.

---

### Task 3: Integrate `LoadingCurtain` and `ViewerErrorView` into `ExhibitionViewer.tsx`

**Files:**
- Modify: `src/components/viewer/ExhibitionViewer.tsx`
- Modify: `src/components/viewer/viewer.test.tsx`

**Interfaces:**
- Consumes: `LoadingCurtain`, `ViewerErrorView`, `IntroVideoLoader`, `getIntroAnimation`

- [ ] **Step 1: Update `ExhibitionViewer.tsx`**
  - Parse `introTransition` from `exhibition.settings_json` (default `slide_up`).
  - When no intro video is configured: `LoadingCurtain` auto-reveals with the configured transition as soon as `isSceneReady` is true.
  - When intro video is configured: `IntroVideoLoader` handles playback and skip button.
  - When `loadState === 'error'` or exhibition is missing: render `ViewerErrorView`.

- [ ] **Step 2: Update existing viewer tests**
  - Verify `viewer.test.tsx` handles new loading and error components gracefully.

- [ ] **Step 3: Run test suite to verify pass**
  - Run `pnpm vitest run src/components/viewer/viewer.test.tsx`.

---

### Task 4: Enhance Curator Studio Initial Auth Loader & Studio Error Handling

**Files:**
- Modify: `src/components/studio/StudioApp.tsx`
- Modify: `src/styles/reda-studio.css`
- Test: `src/components/studio/StudioApp.test.tsx`

- [ ] **Step 1: Update `StudioApp.tsx` loading state**
  - Replace raw text with a stylized Renaissance gold emblem & subtle pulsing dot spinner.

- [ ] **Step 2: Run test suite to verify pass**
  - Run `pnpm vitest run src/components/studio/StudioApp.test.tsx`.

---

### Task 5: Full Regression Testing & Verification

- [ ] **Step 1: Run complete vitest test suite**
  - Run `pnpm vitest run`.
- [ ] **Step 2: Verify all test suites pass with 0 errors.**
