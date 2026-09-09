---
target: src/components
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Claude\\3D Virtual Gallery\\src\\components"
timestamp: 2026-09-09T13-50-31Z
slug: src-components
---
# Impeccable Design Critique: REDA Virtual Gallery (redesign/foundation)

⚠️ DEGRADED: single-context (running as subagent without subagent-spawn capability; assessments run sequentially)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading curtain has great stage feedback; hotspot transition save message fades after 3s with no persistent state indicator. |
| 2 | Match System / Real World | 2 | Complete absence of Vietnamese copy despite "Tranh Việt" design identity; gamer jargon ("FPS Mode", "WASD walk", "Spawn Point") leaks into curatorial space. |
| 3 | User Control and Freedom | 2 | Instant hotspot deletion with zero undo; artwork deletion uses blocking `window.confirm()`; audio autoplays without consent; no switch to 2D catalog when WebGL is active. |
| 4 | Consistency and Standards | 2 | 82 automated detector violations; extensive inline styling and off-ramp colors/radii in `SetupSheet.tsx` and `ArtistViewerPreview.tsx`; kicker rule violated. |
| 5 | Error Prevention | 2 | No confirmation or soft-delete on hotspot removal; missing field validation before submission in studio forms. |
| 6 | Recognition Rather Than Recall | 3 | Proximity hover tooltips and hotspot directory drawer aid orientation; Inspect lightbox bottom footer is crowded with 7 competing action buttons. |
| 7 | Flexibility and Efficiency | 2 | Studio lacks batch operations (no bulk artwork upload, no drag-and-drop reorder); no keyboard accelerators (`Ctrl+S`) for studio forms. |
| 8 | Aesthetic and Minimalist Design | 3 | Warm lacquer/điệp palette and flat material discipline are well-executed; Inspect lightbox controls and SetupSheet previews suffer from clutter. |
| 9 | Error Recovery | 2 | Dedicated error screens in viewer, but `ErrorBoundary.tsx` uses unstyled `#ff6b6b`/`#aaa`; studio form errors dump unhelpful raw response strings. |
| 10 | Help and Documentation | 2 | Basic movement HUD hints provided; lacks curatorial onboarding or in-gallery curatorial statement for visitors. |
| **Total** | | **23/40** | **Acceptable** |

---

## Design Specificity Verdict

### LLM Assessment
The creative north star defined in `DESIGN.md` ("REDA — Tranh Việt") envisions a deeply authentic Vietnamese painting house rooted in **sơn mài** (lacquer hall for viewing) and **giấy điệp** (workshop for curation), utilizing Vietnamese foundry typography (UTM Dragon Fire and MJ Modern) and culturally specific copy ("Vào phòng tranh", "Nghe thuyết minh", "Xem chi tiết").

However, the current implementation reveals a profound split identity:
- **Missing Vietnamese Identity**: 100% of the UI chrome across both Viewer and Studio is hardcoded in English ("Enter Exhibition", "Inspect Full Resolution", "WASD walk", "FPS Mode", "Cinema Mode", "Curated by"). Not a single instance of the specified Vietnamese phrases appears in the codebase. As a result, the display typeface (UTM Dragon Fire), specifically selected because it performs on Vietnamese diacritics, is squandered.
- **Category-Interchangeable Studio**: While the viewer captures the dark lacquer mood, the Studio workbench is structured as a generic 3D CAD/game-engine editor (TopBar, ToolRail, Inspector, Gizmos) reminiscent of Unity or Spline rather than a bespoke Vietnamese art curation workshop.
- **Gaming Jargon Leakage**: Visitors are greeted with technical video game terminology ("WASD walk", "FPS Mode", "Mouse looks", "Click floor to teleport", "FOV") rather than museum-appropriate navigation metaphors.

### Deterministic Scan Summary
The automated detector flagged **82 advisory notes** across 10 component files in `src/components/`:
- **33 `design-system-color` violations**: Hardcoded hex and rgba values outside `DESIGN.md` (e.g. `#4a3e32`, `#b98a3c`, `#fffdf8`, `#1d1b17`, `#e8dcbe` in `SetupSheet.tsx`; `rgba(35, 32, 25, 0.6)`, `#3e3226` in `ArtistViewerPreview.tsx`; `#FFFFFF` in `ArtworkForm.tsx`; `#ff6b6b`, `#aaa` in `ErrorBoundary.tsx`).
- **32 `design-system-font-size` violations**: Arbitrary font sizes off the documented type ramp (e.g. `8.5px`, `9px`, `9.5px`, `10px`, `12px`, `12.5px`, `13px`, `28px`, `0.85rem`).
- **17 `design-system-radius` violations**: Ad-hoc border radii (`2px`, `4px`, `6px`, `8px`, `12px`) violating the 4-tier radius scale (`sm: 3px`, `md: 5px`, `card: 14px`, `pill: 999px`).

**Top Offending Files:**
1. `src/components/studio/workbench/SetupSheet.tsx` — 30 findings (inline preview styles bypass tokens entirely)
2. `src/components/studio/workbench/ArtistViewerPreview.tsx` — 21 findings (duplicates 800+ lines of modal layout with raw inline styles instead of reusing `ArtistDetailModal`)
3. `src/components/studio/ArtworkForm.tsx` — 10 findings
4. `src/components/studio/HotspotEditor.tsx` — 5 findings
5. `src/components/studio/workbench/ArtistInspector.tsx` — 5 findings

### Visual Overlays
No live browser injection overlay was performed in this environment; deterministic findings are captured directly via the CLI scanner.

---

## Overall Impression
REDA possesses strong aesthetic foundations: the dual-register color theory (lacquer dark and điệp cream) and the tactile physics of the Inspect Lightbox feel premium and respectful of visual art. However, the experience currently stumbles over two major obstacles: it fails to speak its own authored cultural language (100% English chrome), and its Studio workbench suffers from code duplication and token abandonment. Bridging these gaps will transform REDA from a generic 3D model viewer into an authentic cultural showcase.

---

## What's Working
1. **Tactile Material Atmosphere**: The dark lacquer stage (`--reda-char`), warm lighting gradients, and flat material discipline (banning fake CSS noise/grain) allow artworks to take center stage with museum dignity.
2. **Inspect Lightbox Physics**: The spring-damped inertial pan/zoom, 3D perspective slab tilt with realistic bevels, and cinematic arc-dip transitions between detail hotspots create an exceptional viewing experience.
3. **Unobtrusive Roam HUD & Proximity Tooltips**: The gallery controls pill bar recedes quietly during exploration, while hover tooltips on 3D meshes provide immediate recognition without breaking visual immersion.

---

## Priority Issues

### [P1] Vietnamese-First Cultural Identity Missing from Interface Chrome
- **What**: Every piece of UI chrome in both Viewer and Studio is hardcoded in English ("Enter Exhibition", "Inspect Full Resolution", "WASD walk", "FPS Mode", "Artwork details", "Hotspots Directory").
- **Why**: Directly violates `DESIGN.md` ("A Vietnamese painting house", "museum voice in Vietnamese by default"). Squanders the UTM Dragon Fire typeface and feels alien to local visitors.
- **Fix**: Create a localization dictionary with Vietnamese as default (e.g., "Vào phòng tranh", "Xem chi tiết", "Nghe thuyết minh") and add a language toggle.
- **Suggested Command**: `/impeccable clarify`

### [P1] Design System Token Drift & Component Duplication in Studio
- **What**: 82 detector violations with hardcoded hexes, arbitrary radii, and off-ramp font sizes. `ArtistViewerPreview.tsx` duplicates 800+ lines of modal layout inline instead of reusing `ArtistDetailModal.tsx`.
- **Why**: Creates severe visual inconsistency, inflates bundle size, and causes layout bugs as the real viewer modal evolves independently.
- **Fix**: Refactor `ArtistViewerPreview` to render the shared `ArtistDetailModal` component; replace inline CSS in `SetupSheet.tsx` with REDA CSS custom properties.
- **Suggested Command**: `/impeccable polish`

### [P1] Accessibility Barrier: Keyboard & Screen Reader Users Trapped in 3D Canvas
- **What**: In 3D roam mode, artworks exist only as BabylonJS meshes inside an unlabelled `<canvas>`. There are no DOM nodes or focus targets for artworks. The accessible 2D `FallbackCatalog` is hardcoded to render only when `!webglSupported`.
- **Why**: Keyboard-only users and screen reader visitors (Persona Sam) cannot discover, tab to, or open artworks in the gallery.
- **Fix**: Add a prominent "Catalog View (2D)" toggle button in the HUD, and provide an accessible hidden DOM list of artworks with skip links.
- **Suggested Command**: `/impeccable adapt`

### [P2] Intrusive Audio Autoplay in Focus and Inspect Modes
- **What**: Opening an artwork's focus view (`FocusPanel.tsx:39`) automatically plays voice narration out loud even with the info card closed. Selecting a hotspot on desktop (`InspectDesktopSidebar.tsx:33`) auto-plays dedicated audio.
- **Why**: Violates WCAG 1.4.2, disrupts screen readers, and creates an abrasive experience for users browsing in quiet spaces.
- **Fix**: Require explicit visitor opt-in (clicking "Nghe thuyết minh / Listen") before playing audio, or respect a global mute toggle in the viewer HUD.
- **Suggested Command**: `/impeccable quieter`

### [P2] Destructive Hotspot Deletion & Crude Confirmation Prompts
- **What**: `HotspotEditor.tsx:207` deletes hotspots immediately upon clicking with no confirmation or undo. `ArtworkForm.tsx:139` and `ArtistInspector.tsx:132` rely on browser-native `window.confirm()`.
- **Why**: High risk of permanent data loss for curators; blocking native dialogs break visual polish and tab responsiveness.
- **Fix**: Add an in-app confirmation modal or a 5-second "Undo" snackbar for deleted hotspots and artworks.
- **Suggested Command**: `/impeccable harden`

---

## Persona Red Flags

### 1. Sam (Accessibility-Dependent User)
- **Trapped in 3D canvas**: Tabbing enters the canvas element, but no individual artworks can be focused or navigated via keyboard.
- **Blocked from 2D catalog**: `FallbackCatalog` is strictly gated behind `!webglSupported`. Because modern browsers support WebGL2, Sam is permanently locked out of the accessible view.
- **Audio cacophony**: Focusing an artwork immediately autoplays spoken narration over Sam's screen reader (VoiceOver / NVDA) with no pre-flight volume control.

### 2. Alex (Impatient Power User / Curator)
- **Zero batch workflows**: In Studio Workbench, artworks and hotspots must be configured one by one; there is no bulk upload, mass tagging, or batch artist assignment.
- **Unforgiving deletion**: Accidentally clicking "Delete Hotspot" immediately wipes the hotspot without confirmation or undo.
- **Missing accelerators**: Pressing `Ctrl+S` / `Cmd+S` in `ArtworkForm` triggers browser "Save Page As" instead of saving the form.

### 3. Jordan (Confused First-Timer Art Lover)
- **Gamer jargon barrier**: Encountering "FPS Mode", "WASD walk", "FOV", and "Waypoints" creates immediate confusion for someone expecting a museum visit.
- **Choice overload in Inspect Mode**: The bottom controls bar presents 7 simultaneous options ("Reset View", "3D Tilt", "Prev", "Details (n)", "Next", "Listen", "Guide"), causing decision paralysis.

---

## Minor Observations
- **Kicker Rule Violation**: `LoadingCurtain.tsx` (`loading-curtain__kicker`) and `reda-viewer.css` (`.eyebrow`) violate `DESIGN.md:175` ("The No-Kicker Rule: No mono eyebrow/kicker above a heading").
- **Play Glyph on Enter Button**: `IntroVideoLoader.tsx` includes an `<Icon name="play" />` inside `.intro-start-btn`, violating `DESIGN.md:203` ("This is the 'Vào phòng tranh' moment — text alone, no seal glyph").
- **ErrorBoundary Theming**: `src/components/common/ErrorBoundary.tsx` uses unstyled inline hex codes (`#ff6b6b`, `#aaa`) instead of REDA error tokens.
- **Draggable Sidebar Viewport Overflow**: In `InspectDesktopSidebar.tsx`, the minimized panel can be dragged beyond the browser viewport boundaries and lost offscreen on resize.

---

## Questions to Consider

1. **Language & Identity**: The current UI chrome is entirely in English, bypassing the "Tranh Việt" Vietnamese-first identity and leaving the UTM Dragon Fire display typeface underutilized. How would you like to address this?
   - **Option A**: Implement full Vietnamese-first default chrome ("Vào phòng tranh", "Xem chi tiết", "Nghe thuyết minh") with an English toggle.
   - **Option B**: Add a dedicated i18n switcher in the header allowing visitors to choose between Tiếng Việt and English.
   - **Option C**: Keep English chrome for international reach, but introduce bilingual titles and exhibition metadata.

2. **Studio Token Refactoring**: Automated scans caught 82 design system violations, largely from `ArtistViewerPreview.tsx` duplicating modal styles inline and `SetupSheet.tsx` using raw hexes. What scope should we take for the cleanup?
   - **Option A**: Full component unification — eliminate inline duplication in `ArtistViewerPreview` by reusing `ArtistDetailModal`, and tokenize `SetupSheet`.
   - **Option B**: Token-only patch — replace hardcoded hexes/radii with CSS variables without restructuring components.

3. **Audio Autoplay Experience**: Currently, audio narration automatically begins playing as soon as a visitor focuses an artwork. What audio behavior best matches your curatorial vision?
   - **Option A**: Strict opt-in — audio never autoplays; visitor must explicitly click "Nghe thuyết minh".
   - **Option B**: Ambient by default, with a prominent global mute toggle in the bottom roam HUD.
