# REDA Redesign 02 — Viewer Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Read `2026-09-08-reda-redesign-00-roadmap.md` (shared context + Global Constraints) and finish `01-foundation.md` before starting this. Steps use `- [ ]`.

**Goal:** Restyle the visitor Exhibition Viewer to match `mockup/viewer/**` (desktop) and `mockup/viewer/mobile/**` (iPhone SE 667×375), in the **dark sơn-mài register**, preserving 100% of viewer behavior.

**Architecture:** One shared React viewer (`src/components/viewer/*`) rendered at `/e/:slug` by `ExhibitionViewer.tsx`; mobile is the same tree via CSS breakpoints + `VirtualJoystick`. Styling is global CSS: `src/styles/reda-viewer.css` (2841 lines, already token-based) + component inline styles + leftover rules in `App.css` (handled by Plan 01). This plan aligns `reda-viewer.css` + a few component inline styles/class props to the mockups; it does **not** change component logic, DOM shape, or props.

**Tech Stack:** React 19 + TS, Babylon.js, plain global CSS, `--reda-*` tokens, Vitest (dom project), pnpm.

## Global Constraints

All from the roadmap apply. Viewer-specific:
- **Dark register only.** Grounds `--reda-char`/`--reda-char-2`/`--reda-wall*`; text `--reda-cream(-hi)`/`--reda-muted`; the **parchment wall-placard is the one light accent allowed**. No studio-light leakage.
- **son** = the enter/commit action (`Enter Exhibition`); **gold** = single accent, never a fill; **chàm** `--reda-cham-hi` = hotspot pins + inspect-mode markers.
- Keep `<Icon>` (no emoji — `no-emoji.test.ts`). Keep English copy.
- **Fixed-Pin Rule:** hotspot pins stay a constant screen size across zoom (already true — `HotspotOverlay` renders px pins outside the transformed image; do not regress).
- Every existing viewer test must stay green; when a restyle changes a class/text a test asserts, update that test in the same task.

## Feature-preservation checklist (MUST all still work after restyle)

Verified from code. Do not remove or rewire any of these — restyle their appearance only.

- **Intro:** two mutually-exclusive paths — `IntroVideoLoader` (video splash: Enter Exhibition play → unmute+play, muted-autoplay fallback, "Preparing 3D gallery space…" / "Finalizing…" states, skip when ready, exit transition) and `LoadingCurtain` (progress bar `role=progressbar` with staged phrases, reveal transition). Ambient room audio (loop 0.35, ducks to 0.08 under a focused guide). 6 intro transition presets (`intro-animations.ts`).
- **Roam:** `viewer__canvas` (autofocus, tabIndex 0); `controlMode` gallery/fps toggle (hotkey `C` + pill); desktop `viewer-controls-hint` HUD (mode pill+kbd, WASD, drag/click-art/click-floor OR fps variants, Settings gear); mobile `btn-mobile-settings` + `VirtualJoystick` (50px, rAF move loop); fps `viewer__crosshair`; `ArtworkHoverTooltip`.
- **Focus (`FocusPanel`):** exit-detail header bar with info `i` toggle + play/pause narration; auto-play guide (persistent `<audio>`); info popover (artist/title,year/Medium/Dimensions/description/`AudioGuidePlayer`/YouTube for VIDEO); Read Artist Bio; Inspect Full Resolution / Open Cinema Mode; side-rail prev/next.
- **`AudioGuidePlayer`:** play/pause, seek scrubber (gold fill), current/total time, volume+mute, PLAYING/READY/AUDIO badge; controls a parent-owned `<audio>`.
- **Inspect (`InspectLightbox`):** pan (drag/touch), zoom (wheel-to-cursor + pinch, 0.1–8), 3D tilt (right-drag / mobile tilt-mode, ±25°, gated by `isTiltEnabled`); frame slab visuals; header desktop (Inspect Mode eyebrow/title/artist/About) vs **mobile active-hotspot title-swap + "See more/See less" + blur backdrop** (already coded); Hotspots List drawer; `HotspotOverlay` pins (active fades); desktop `InspectDesktopSidebar` (draggable/minimizable, dedicated `<audio>`, "Jump to Ns", Prev/Next); footer Reset / 3D-Tilt toggle / Prev / counter / Next / mobile Listen+Guide; keyboard ESC unwind + arrows; 5 hotspot flight presets; `onAudioSeek` guide-seek with end-watcher.
- **Artist modal (`ArtistDetailModal`):** two-column portrait + life-dates/contact overlay, Featured-Artist name/quote/biography (split on `\n\n`), ESC/backdrop close.
- **Fallback (`FallbackCatalog`):** non-WebGL2 2D grid (img/YouTube + meta + `<audio controls>`), WebGL2 notice.
- **Settings (`SettingsModal`):** FOV/speed/control-mode/invert toggles, localStorage persist.
- **Errors (`ViewerErrorView`):** not_found / private / network_error variants.

## Mockup ↔ component map

| Mockup | Component(s) | Register |
|---|---|---|
| `viewer/viewer-01-intro.html`, `mobile/viewer-m-01` | `LoadingCurtain.tsx` (no-video), `IntroVideoLoader.tsx` | dark |
| `viewer/viewer-05-intro-video.html`, `mobile/viewer-m-05` | `IntroVideoLoader.tsx` | dark |
| `viewer/viewer-02-roam.html`, `mobile/viewer-m-02` | `ExhibitionViewer.tsx` HUD (`:630-683`), `VirtualJoystick.tsx`, `ArtworkHoverTooltip.tsx` | dark |
| `viewer/viewer-03-focus.html`, `mobile/viewer-m-03` | `FocusPanel.tsx`, `AudioGuidePlayer.tsx` | dark + placard light |
| `viewer/viewer-04-artist-modal.html`, `mobile/viewer-m-04` | `ArtistDetailModal.tsx` | dark |
| `viewer/viewer-06-inspect.html`, `viewer-07-inspect-detail.html`, `mobile/viewer-m-06`, `viewer-m-07` | `InspectLightbox.tsx`, `InspectDesktopSidebar.tsx`, `HotspotOverlay.tsx` | dark |
| (settings / error / fallback — no dedicated mockup) | `SettingsModal.tsx`, `ViewerErrorView.tsx`, `FallbackCatalog.tsx` | dark, match token system |

**Primary stylesheet:** `src/styles/reda-viewer.css`. **Also check** component inline `style={{…}}` in `IntroVideoLoader.tsx`, `InspectLightbox.tsx`, `SettingsModal.tsx` (Global map flagged these carry inline styles).

---

### Task 1: Intro — LoadingCurtain + IntroVideoLoader

**Files:**
- Modify: `src/styles/reda-viewer.css` (loading-curtain, intro-video sections), `src/components/viewer/LoadingCurtain.tsx` (class/copy only), `src/components/viewer/IntroVideoLoader.tsx`
- Test: `src/components/viewer/LoadingCurtain.test.tsx`, `IntroVideoLoader.test.tsx` (update only if a changed class/text is asserted)

**Preserve:** both intro paths, progress bar + staged phrases, all transition presets, video autoplay fallback chain, skip/enter buttons, exit-fade classes.

- [ ] **Step 1:** Open `mockup/viewer/viewer-01-intro.html` and `viewer-05-intro-video.html` (+ `mobile/viewer-m-01`, `-05`) as the visual target. Restyle `reda-viewer.css` intro rules to match: big **UTM Dragon Fire** display title (`font-family: var(--reda-display)`, `clamp(60px,11vw,150px)` desktop / `clamp(30px,7vw,52px)` mobile), `--reda-son` "Enter Exhibition" pill, `--reda-gold` progress fill + spinner, `--reda-cream(-hi)`/`--reda-muted` text on `--reda-char` ground.
- [ ] **Step 2 (No-Kicker):** `LoadingCurtain.tsx:57-77` renders a kicker "Reda Archival Gallery · Curated Space" above the title. Per the No-Kicker rule, demote it: remove `text-transform:uppercase`/`letter-spacing` in its CSS and render it as a quiet byline under the title (or drop it). Keep the `/reda_logo.png` emblem. Update `LoadingCurtain.test.tsx` if it asserts the kicker text/case.
- [ ] **Step 3:** `pnpm test -- src/components/viewer/LoadingCurtain.test.tsx src/components/viewer/IntroVideoLoader.test.tsx` → PASS.
- [ ] **Step 4:** `pnpm dev`, screenshot both intro paths at desktop + SE1; compare to the mockups (title face, son enter, progress phrasing intact).
- [ ] **Step 5:** `git add -A && git commit -m "style(viewer): restyle intro/loading to Tranh Việt"`

---

### Task 2: Roam HUD + VirtualJoystick + hover tooltip

**Files:**
- Modify: `src/styles/reda-viewer.css` (`viewer-controls-hint`, `btn-settings-hud`, `btn-mobile-settings`, joystick, crosshair, hover-tooltip sections), `src/components/viewer/VirtualJoystick.tsx` (class/inline only), `src/components/viewer/ArtworkHoverTooltip.tsx`
- Test: `src/components/viewer/VirtualJoystick.test.tsx`

**Preserve:** gallery/fps toggle + hotkey `C`, all HUD hint variants (fps vs gallery), Settings gear, mobile settings button, joystick rAF move + `onMove` vector, crosshair active state, tooltip edge-clamp + isCenter.

- [ ] **Step 1:** Target `mockup/viewer/viewer-02-roam.html` + `mobile/viewer-m-02`. Restyle the HUD bar to the dark glass pill (`--reda-glass` bg, gold hairline `rgba(201,163,91,.28)`, `--reda-cream-hi` labels, `--reda-gold-hi` mode label, mono keycaps). Keep the idle-fade behavior already in the code (`ExhibitionViewer` HUD) — match the mockup's `.hud.idle{opacity:.35}` feel; if not present, add a CSS-only idle class hook (no logic change beyond a timer that already exists per the mockup pattern — do NOT add new JS if the HUD has none; restyle only).
- [ ] **Step 2 (joystick, One Gold):** Restyle `VirtualJoystick` to the mockup/Gemini-audited knob — **lacquer core + 1.5px gold hairline + small gold center pip** (not a solid gold disc): base `rgba(14,10,5,.5)` + `1.5px solid rgba(201,163,91,.4)`, knob `var(--reda-char-2)` with a gold hairline + pip. Add dark backing pills behind `Di chuyển`/look labels for contrast (`rgba(14,13,10,.75)`). Keep the 50px radius + move loop.
- [ ] **Step 3:** `pnpm test -- src/components/viewer/VirtualJoystick.test.tsx` → PASS.
- [ ] **Step 4:** `pnpm dev`, screenshot roam desktop + SE1 (mobile emulation, touch); confirm joystick + tips + HUD match.
- [ ] **Step 5:** `git add -A && git commit -m "style(viewer): restyle roam HUD + joystick"`

---

### Task 3: Focus panel + AudioGuidePlayer

**Files:**
- Modify: `src/styles/reda-viewer.css` (focus-header-bar, focus-info-modal, focus-nav-rail, audio-guide-player sections), `src/components/viewer/FocusPanel.tsx`, `src/components/viewer/AudioGuidePlayer.tsx`
- Test: `src/components/viewer/FocusPanel.test.tsx`

**Preserve:** exit-detail + info toggle + play/pause narration; auto-play guide element; info popover sections (artist/title,year/Medium/Dimensions/description/YouTube); Read Artist Bio; Inspect Full Resolution / Open Cinema Mode; prev/next rail; scrubber/volume/mute/time/badge.

- [ ] **Step 1:** Target `mockup/viewer/viewer-03-focus.html` + `mobile/viewer-m-03`. Placard = the one **light** eggshell card (`--reda-eggshell` bg, `--reda-ink` text, parch border). Info panel = dark (`--reda-char-2`), gold accent label, `--reda-cream` body.
- [ ] **Step 2 (One Gold / Meaningful Red):** "Inspect Full Resolution" is the panel's primary — style it **gold-outline** (`color:var(--reda-gold-hi); background:rgba(201,163,91,.12); border:1px solid var(--reda-gold-hi)`), NOT a gold fill; "Read Artist Bio" = ghost; the audio play control = gold-outline ring; the scrubber fill stays `--reda-gold` (thin accent, allowed).
- [ ] **Step 3:** `pnpm test -- src/components/viewer/FocusPanel.test.tsx` → PASS.
- [ ] **Step 4:** `pnpm dev`, screenshot focus desktop + SE1; verify placard, panel, audio guide, both buttons.
- [ ] **Step 5:** `git add -A && git commit -m "style(viewer): restyle focus panel + audio guide"`

---

### Task 4: Inspect lightbox + hotspot overlay + desktop sidebar

**Files:**
- Modify: `src/styles/reda-viewer.css` (inspect-lightbox, hotspot pins/drawer/sidebar sections), `src/components/viewer/InspectLightbox.tsx` (class/inline styles + the eyebrow copy/case + the 3D-Tilt-button gate), `src/components/viewer/InspectDesktopSidebar.tsx`, `src/components/viewer/HotspotOverlay.tsx`
- Test: `src/components/viewer/InspectDesktopSidebar.test.tsx`, `src/components/viewer/inspect-lightbox-chrome.test.ts`, `no-emoji.test.ts`

**Preserve:** the full inspect feature list (pan/zoom/pinch/tilt gated by `isTiltEnabled`; frame slab; desktop vs mobile header; drawer; pins with active-fade + Fixed-Pin; draggable/minimizable sidebar with dedicated audio + Jump-to-Ns; footer controls; keyboard; flight presets; `onAudioSeek`). The **mobile active-hotspot header (title-swap + "See more/See less" + blur backdrop) is already implemented — keep its behavior**, restyle only.

- [ ] **Step 1 (eyebrow, No-Kicker + palette):** `InspectLightbox.tsx:634` renders `<span className="eyebrow">Inspect Mode</span>`. Per the mockups, keep the label but restyle its CSS (in `reda-viewer.css`, `.inspect-lightbox__title-info .eyebrow` — Plan 01 already de-indigoed it) to `color:var(--reda-stone)`, **no uppercase, normal letter-spacing** (matches `viewer-06`'s `.tl .mode`). The mobile `.eyebrow--hotspot` → `var(--reda-gold)`.
- [ ] **Step 2 (pins, chàm + Fixed-Pin):** hotspot pins → `--reda-cham-hi` fill, `--reda-bone-hi` rim, chàm halo; audio-carrying pins get the extra ring (see `viewer-06` `.pin.audio`); the active/focused pin → radiant `--reda-gold` with double halo (per Gemini mobile audit). Confirm pins remain px-sized outside the transform (Fixed-Pin) — do not couple pin size to zoom.
- [ ] **Step 3 (buttons, One Gold / Meaningful Red):** Hotspots-List toggle → neutral dark-lacquer outline (not son); the footer counter "chip" and the sidebar "Jump to Ns" → **gold-outline**, not gold fill; "About {artist}" → ghost pill.
- [ ] **Step 4 (3D Tilt button gate — desktop vs mobile):** Per the mockups, the toolbar **3D Tilt** button is **mobile-only** (desktop tilts via right-drag). In `InspectLightbox.tsx` the tilt toggle currently renders whenever `isTiltEnabled`. Gate its render additionally on `isMobile` (`isTiltEnabled && isMobile`); desktop keeps right-drag tilt (unchanged) and drops the button. Update the hint text branch so desktop reads "right-drag to tilt" and mobile references the 3D Tilt button (the code already has these hint branches — keep them; just ensure the button visibility matches). This is a **visibility gate, not a behavior change** (tilt still works on desktop via right-drag).
- [ ] **Step 5:** Restyle drawer + `InspectDesktopSidebar` to dark `--reda-char-2` panels, gold hairlines, `--reda-cream` text, matching `viewer-06`/`viewer-07`.
- [ ] **Step 6:** `pnpm test -- src/components/viewer/InspectDesktopSidebar.test.tsx src/components/viewer/inspect-lightbox-chrome.test.ts src/components/viewer/no-emoji.test.ts` → PASS (update the chrome test if it asserts the eyebrow case or the tilt-button presence; keep no-emoji green).
- [ ] **Step 7:** `pnpm dev`, screenshot inspect **desktop** (right-drag tilt, no 3D-Tilt button, sidebar) and **SE1 mobile** (3D-Tilt button present, header title-swap + See-more expand with the near-transparent blur, drawer). Compare to `viewer-06/07` + `viewer-m-06/07`.
- [ ] **Step 8:** `git add -A && git commit -m "style(viewer): restyle inspect lightbox, pins, sidebar; gate 3D-Tilt button to mobile"`

---

### Task 5: Artist modal

**Files:**
- Modify: `src/styles/reda-viewer.css` (artist-detail-modal section), `src/components/viewer/ArtistDetailModal.tsx`
- Test: `src/components/viewer/ArtistDetailModal.test.tsx`

**Preserve:** two-column portrait + life-dates/contact overlay, name/quote/biography (`\n\n` split), ESC/backdrop close, "Biography not available" fallback.

- [ ] **Step 1:** Target `mockup/viewer/viewer-04-artist-modal.html` + `mobile/viewer-m-04`. Dark lacquer card, portrait column, gold-hairline quote block (1px, not the 3px thick border — No-Thick-Borders), `--reda-cream`/`--reda-stone` bio. Desktop = two-column; mobile landscape keeps the horizontal card (portrait left, content scrolls). **No-Kicker:** the "Featured Artist" kicker (`ArtistDetailModal.tsx:95-123`) — demote to a quiet non-uppercase label or drop; the name carries it.
- [ ] **Step 2:** `pnpm test -- src/components/viewer/ArtistDetailModal.test.tsx` → PASS (update if it asserts the kicker).
- [ ] **Step 3:** `pnpm dev`, screenshot desktop + SE1 landscape; compare.
- [ ] **Step 4:** `git add -A && git commit -m "style(viewer): restyle artist modal"`

---

### Task 6: Fallback catalog, Settings modal, Error views

**Files:**
- Modify: `src/styles/reda-viewer.css` (fallback, settings, error sections), `src/components/viewer/FallbackCatalog.tsx`, `SettingsModal.tsx` (inline styles flagged), `ViewerErrorView.tsx`
- Test: `src/components/viewer/fallback.test.tsx`, `SettingsModal.test.tsx`, `ViewerErrorView.test.tsx`

**Preserve:** fallback grid + audio controls + WebGL2 notice; settings FOV/speed/control-mode/invert + localStorage; the three error variants + retry-only-on-network.

- [ ] **Step 1:** No dedicated mockup — apply the dark Tranh Việt token system consistently: `--reda-char` grounds, `--reda-cream` text, `--reda-gold` accents, `--reda-son` for any primary/retry action, form controls styled like the viewer's other panels. Ensure `SettingsModal` inline styles use tokens (Plan 01 removed indigo `accent-color`; confirm sliders read `accent-color: var(--reda-gold)`).
- [ ] **Step 2:** `pnpm test -- src/components/viewer/fallback.test.tsx src/components/viewer/SettingsModal.test.tsx src/components/viewer/ViewerErrorView.test.tsx` → PASS.
- [ ] **Step 3:** `pnpm dev`, force each state (disable WebGL for fallback; trigger an error slug) and screenshot; confirm dark register consistency.
- [ ] **Step 4:** `git add -A && git commit -m "style(viewer): restyle fallback, settings, error views"`

---

### Task 7: Full-suite gate + viewer visual regression pass

- [ ] **Step 1:** `pnpm test` → PASS (all dom + node). Fix any CSS-guard drift in `src/lib/reda-viewer-css.test.ts` caused by the restyle (update the guard to the new token expectations; never re-add banned palette).
- [ ] **Step 2:** `pnpm build` → clean typecheck + build.
- [ ] **Step 3:** `pnpm dev`, walk the whole viewer flow (intro → roam → focus → inspect → hotspot detail → artist modal) at desktop and SE1 mobile; confirm each state matches its mockup and every checklist feature works (audio seek, tilt, drawer, prev/next, joystick).
- [ ] **Step 4:** `git commit --allow-empty -m "chore(viewer): restyle verified against mockups"`

## Self-Review (completed)

- **Coverage:** every viewer mockup (01–07 + mobile m-01–07) maps to a task; settings/error/fallback covered in Task 6. ✓
- **Placeholders:** each task cites exact files + the specific token/rule deltas + the mockup as visual spec + a runnable test/screenshot gate. The 3D-Tilt gate and eyebrow de-uppercase are concrete, not "make it nice." ✓
- **Consistency:** the mobile inspect header (title-swap/see-more/blur) is preserved as already-coded; Fixed-Pin preserved; class names referenced (`.eyebrow`, `.eyebrow--hotspot`, `.inspect-lightbox__title-info`, joystick classes) match the exploration findings. ✓
