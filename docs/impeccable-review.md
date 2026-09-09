# REDA — Tranh Việt: Impeccable Critique + Audit Report
**Branch:** `redesign/foundation` · **Date:** September 9, 2026

---

# Part 1: Design Critique (`/impeccable critique`)

⚠️ DEGRADED: single-context (subagent without sub-agent spawn capability; assessments ran sequentially)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading curtain has great stage feedback; hotspot transition save fades with no persistent indicator |
| 2 | Match System / Real World | 2 | 100% English chrome despite "Tranh Việt" identity; gamer jargon ("FPS Mode", "WASD walk") in curatorial space |
| 3 | User Control and Freedom | 2 | Instant hotspot deletion with zero undo; `window.confirm()` for artwork deletion; audio autoplays |
| 4 | Consistency and Standards | 2 | 82 detector violations; extensive inline styling in `SetupSheet.tsx` and `ArtistViewerPreview.tsx` |
| 5 | Error Prevention | 2 | No confirmation on hotspot removal; missing field validation in studio forms |
| 6 | Recognition Rather Than Recall | 3 | Proximity tooltips and hotspot directory aid orientation; inspect footer is crowded (7 buttons) |
| 7 | Flexibility and Efficiency | 2 | No batch operations in studio; no keyboard accelerators (`Ctrl+S`) for forms |
| 8 | Aesthetic and Minimalist Design | 3 | Warm lacquer/điệp palette well-executed; inspect controls and SetupSheet suffer from clutter |
| 9 | Error Recovery | 2 | Dedicated error screens exist, but `ErrorBoundary.tsx` uses unstyled `#ff6b6b`/`#aaa` |
| 10 | Help and Documentation | 2 | Basic movement HUD hints; no curatorial onboarding or in-gallery statement for visitors |
| **Total** | | **23/40** | **Acceptable** |

---

## Design Specificity Verdict

### LLM Assessment
The creative north star in `DESIGN.md` ("REDA — Tranh Việt") envisions a deeply authentic Vietnamese painting house rooted in **sơn mài** (lacquer hall) and **giấy điệp** (workshop), using Vietnamese foundry typography and culturally specific copy.

**However, the implementation reveals a split identity:**
- **Missing Vietnamese Identity**: 100% of UI chrome is hardcoded in English. Not a single Vietnamese phrase appears. The UTM Dragon Fire typeface, selected for Vietnamese diacritics, is squandered.
- **Category-Interchangeable Studio**: The workbench is structured as a generic 3D CAD/game-engine editor (TopBar, ToolRail, Inspector, Gizmos) rather than a bespoke Vietnamese art curation workshop.
- **Gaming Jargon Leakage**: Visitors encounter "WASD walk", "FPS Mode", "Mouse looks", "Click floor to teleport", "FOV" rather than museum-appropriate metaphors.

### Deterministic Scan
**82 advisory notes** across 10 component files:
- **33 `design-system-color`**: Hardcoded hex/rgba values outside DESIGN.md
- **32 `design-system-font-size`**: Arbitrary sizes off the type ramp
- **17 `design-system-radius`**: Ad-hoc radii violating the 4-tier scale

**Top offenders:**
1. [SetupSheet.tsx](file:///D:/Claude/3D%20Virtual%20Gallery/src/components/studio/workbench/SetupSheet.tsx) — 30 findings
2. [ArtistViewerPreview.tsx](file:///D:/Claude/3D%20Virtual%20Gallery/src/components/studio/workbench/ArtistViewerPreview.tsx) — 21 findings
3. [ArtworkForm.tsx](file:///D:/Claude/3D%20Virtual%20Gallery/src/components/studio/ArtworkForm.tsx) — 10 findings

---

## Overall Impression

REDA possesses strong aesthetic foundations: the dual-register color theory (lacquer dark and điệp cream) and the tactile physics of the Inspect Lightbox feel premium and respectful of visual art. However, it fails to speak its own authored cultural language (100% English chrome), and its Studio workbench suffers from code duplication and token abandonment.

## What's Working

1. **Tactile Material Atmosphere**: The dark lacquer stage, warm lighting gradients, and flat material discipline allow artworks to take center stage with museum dignity.
2. **Inspect Lightbox Physics**: Spring-damped inertial pan/zoom, 3D perspective slab tilt with realistic bevels, and cinematic arc-dip transitions between hotspots create an exceptional viewing experience.
3. **Unobtrusive Roam HUD & Proximity Tooltips**: The gallery controls pill bar recedes quietly during exploration while hover tooltips provide immediate recognition without breaking immersion.

---

## Priority Issues

### [P1] Vietnamese-First Cultural Identity Missing
- **What**: Every piece of UI chrome is hardcoded in English
- **Why**: Violates DESIGN.md ("A Vietnamese painting house", "museum voice in Vietnamese by default"). Squanders UTM Dragon Fire.
- **Fix**: Create localization dictionary with Vietnamese default; add language toggle
- **Suggested**: `/impeccable clarify`

### [P1] Design System Token Drift & Component Duplication
- **What**: 82 detector violations; `ArtistViewerPreview.tsx` duplicates 800+ lines instead of reusing `ArtistDetailModal`
- **Why**: Visual inconsistency, inflated bundle, layout bugs as viewer modal evolves independently
- **Fix**: Refactor to shared component; replace inline CSS with REDA tokens
- **Suggested**: `/impeccable polish`

### [P1] Accessibility Barrier: Keyboard Users Trapped in 3D Canvas
- **What**: In 3D roam, artworks exist only as BabylonJS meshes; no DOM focus targets. `FallbackCatalog` only renders when `!webglSupported`
- **Why**: Keyboard-only and screen reader users cannot discover or open artworks
- **Fix**: Add "Catalog View (2D)" toggle in HUD; provide accessible hidden DOM list
- **Suggested**: `/impeccable adapt`

### [P2] Intrusive Audio Autoplay
- **What**: Focus view auto-plays voice narration; hotspot selection auto-plays audio
- **Why**: Violates WCAG 1.4.2; disrupts screen readers; abrasive in quiet spaces
- **Fix**: Require explicit opt-in before playing audio
- **Suggested**: `/impeccable quieter`

### [P2] Destructive Hotspot Deletion & Crude Confirmation
- **What**: Hotspots delete immediately with no undo; artwork deletion uses `window.confirm()`
- **Why**: High data loss risk; native dialogs break visual polish
- **Fix**: In-app confirmation modal or 5-second undo snackbar
- **Suggested**: `/impeccable harden`

---

## Persona Red Flags

### Sam (Accessibility-Dependent User)
- Trapped in 3D canvas with no focusable artwork elements
- Locked out of `FallbackCatalog` because modern browsers support WebGL2
- Auto-narration plays over screen reader output

### Alex (Impatient Power User / Curator)
- Zero batch workflows in Studio (one-by-one only)
- Accidental hotspot deletion with no undo
- `Ctrl+S` triggers browser "Save Page As" instead of form save

### Jordan (Confused First-Timer)
- "FPS Mode", "WASD walk", "FOV", "Waypoints" create immediate confusion
- 7 simultaneous buttons in Inspect Mode bottom bar cause decision paralysis

---

## Minor Observations

- **Kicker Rule Violation**: `LoadingCurtain.tsx` `.loading-curtain__kicker` and `.eyebrow` in CSS violate DESIGN.md No-Kicker Rule
- **Play Glyph on Enter Button**: `IntroVideoLoader.tsx` includes `<Icon name="play" />` inside `.intro-start-btn`, violating DESIGN.md ("text alone, no seal glyph")
- **ErrorBoundary Theming**: Uses unstyled `#ff6b6b`/`#aaa` instead of REDA error tokens
- **Draggable Sidebar Overflow**: Minimized `InspectDesktopSidebar` can be dragged beyond viewport and lost offscreen

---

## Critique Questions

1. **Language & Identity**: How to address 100% English chrome vs "Tranh Việt" Vietnamese-first identity?
   - **A**: Full Vietnamese-first default with English toggle
   - **B**: i18n switcher allowing visitor choice
   - **C**: Keep English chrome, bilingual titles/metadata only

2. **Studio Token Refactoring**: 82 design system violations scope?
   - **A**: Full component unification (reuse `ArtistDetailModal`, tokenize `SetupSheet`)
   - **B**: Token-only patch (replace hexes/radii without restructuring)

3. **Audio Autoplay**: What audio behavior matches curatorial vision?
   - **A**: Strict opt-in (visitor must click play)
   - **B**: Ambient by default with global mute toggle

---
---

# Part 2: Technical Audit (`/impeccable audit`)

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility (A11y) | 2 | Missing `.reda-dark` scope breaks focus-visible & `prefers-reduced-motion`; no Escape/focus-trap on modals |
| 2 | Performance | 2 | 70+ `backdrop-filter: blur()` over WebGL canvas; 4.3 MB Babylon chunk; 4 dead font packages |
| 3 | Responsive Design | 2 | Studio touch targets as small as 28×28px; inspector overlays viewport on <1024px |
| 4 | Theming | 2 | 6 undefined CSS tokens referenced 60+ times; `--reda-muted-2` fails AA contrast |
| 5 | Implementation Integrity | 2 | Legacy "Renaissance Codex" copy lingers; 3.3k-line `App.css` duplicates `reda-viewer.css` |
| **Total** | | **10/20** | **Acceptable (significant work needed)** |

---

## Implementation Integrity Verdict: FAIL

1. **6 CSS tokens** (`--reda-stone`, `--reda-bone-hi`, `--reda-bone`, `--reda-serif`, `--reda-char-1`, `--reda-danger`) used 60+ times but **never defined in `tokens.css`** → silent browser fallback failures
2. **Legacy identity residue**: `ViewerErrorView.tsx` and `LoadingCurtain.tsx` still display retired Renaissance Codex copy and violate No-Kicker Rule
3. **Dual competing CSS**: `App.css` (3,346 lines) and `reda-viewer.css` (3,875 lines) both loaded with overlapping selectors creating cascade instability

---

## Issue Summary: **0 P0 · 5 P1 · 7 P2 · 3 P3** (15 total)

### P1 — Major Issues

| ID | Issue | Location | Category |
|----|-------|----------|----------|
| P1-01 | Missing `.reda-dark` on viewer root breaks `:focus-visible` and `prefers-reduced-motion` | `ExhibitionViewer.tsx:493` | A11y |
| P1-02 | 6 undefined CSS tokens referenced in production | `tokens.css`, `reda-viewer.css`, `ArtistViewerPreview.tsx` | Theming |
| P1-03 | Lightboxes/modals lack Escape key and focus trapping | `InspectLightbox.tsx`, `FocusPanel.tsx`, `SettingsModal.tsx` | A11y |
| P1-04 | Range sliders lack accessible names | `SettingsModal.tsx:110,137,164,191` | A11y |
| P1-05 | `--reda-muted-2` (#7C7563) fails AA contrast on both dark and light surfaces | `tokens.css:38`, multiple components | A11y/Theming |

### P2 — Minor Issues

| ID | Issue | Location | Category |
|----|-------|----------|----------|
| P2-01 | Legacy Renaissance Codex copy & kicker violations | `ViewerErrorView.tsx`, `LoadingCurtain.tsx` | Integrity |
| P2-02 | 4.3 MB BabylonJS chunk + 4 dead font packages | `package.json`, `vite.config.ts` | Performance |
| P2-03 | 70+ `backdrop-filter: blur()` over WebGL canvas | `reda-viewer.css`, `App.css` | Performance |
| P2-04 | Sub-30px touch targets in Studio | `reda-workbench.css:20,32` | Responsive |
| P2-05 | 82 design-system drift violations (hardcoded colors/radii/fonts) | `SetupSheet.tsx`, `ArtistViewerPreview.tsx` | Integrity |
| P2-06 | Dual `App.css`/`reda-viewer.css` with overlapping selectors | `main.tsx:4,11` | Integrity |
| P2-07 | Broken dead links in error view (`/login` not a route) | `ViewerErrorView.tsx:63,66` | Integrity |

### P3 — Polish

| ID | Issue | Location | Category |
|----|-------|----------|----------|
| P3-01 | Audio autoplay on focus panel open | `FocusPanel.tsx:38-44` | A11y/UX |
| P3-02 | No arrow key navigation between artworks in focus mode | `FocusPanel.tsx:210-235` | A11y |
| P3-03 | Micro font sizes under 10px (8.5px, 9px) | `SetupSheet.tsx`, `ArtworkForm.tsx` | Typography |

---

## Positive Findings

1. **Vietnamese Foundry Typography**: UTM Dragon Fire + MJ Modern with complete diacritic support
2. **Strict Iconography Standards**: `no-emoji.test.ts` enforces clean SVG `<Icon>` usage
3. **Comprehensive Test Suite**: 253 tests across 53 suites pass cleanly
4. **Resilient 2D Fallback**: `FallbackCatalog.tsx` provides fully accessible semantic HTML
5. **Route-Level Code Splitting**: Proper `React.lazy()` prevents visitors downloading Studio bundles

---

## Recommended Action Plan (Combined)

| Priority | Command | Focus |
|----------|---------|-------|
| **P1** | `/impeccable harden` | Add `.reda-dark` to viewer root; Escape key + focus traps on modals; `aria-label` on sliders; explicit audio opt-in |
| **P1** | `/impeccable colorize` | Define 6 missing tokens in `tokens.css`; fix `--reda-muted-2` contrast failures |
| **P2** | `/impeccable clarify` | Strip Renaissance Codex copy; remove kickers; fix dead `/login` links; address Vietnamese-first chrome |
| **P2** | `/impeccable optimize` | Split 4.3 MB Babylon chunk; uninstall dead font deps; reduce 70+ backdrop blurs |
| **P2** | `/impeccable layout` | Expand Studio touch targets to 44px minimum; fix inspector viewport overflow |
| **P2** | `/impeccable distill` | Deduplicate `App.css` vs `reda-viewer.css`; replace 82 hardcoded tokens in Studio components |
| **P3** | `/impeccable typeset` | Enforce minimum 11px font sizes across micro-labels |
| **Final** | `/impeccable polish` | Final pass on transitions, focus rings, hover states, spacing rhythm |

> You can ask me to run these one at a time, all at once, or in any order you prefer.
> Re-run `/impeccable critique` and `/impeccable audit` after fixes to see scores improve.
